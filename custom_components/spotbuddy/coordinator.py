"""Coordinator for SpotBuddy.

Holds the committed run plan fetched from the SpotBuddy backend and derives the
current relay state from it. All optimization happens server-side; this class is
deliberately thin.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, time, timedelta
import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.event import async_track_time_change
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator
from homeassistant.util import dt as dt_util

from .const import (
    CONF_BASE_URL,
    CONF_LATITUDE,
    CONF_LONGITUDE,
    DEFAULT_DURATION_HOURS,
    DEFAULT_READY_BY,
    DOMAIN,
    PLAN_REFRESH_HOURS_UTC,
    PLAN_REFRESH_MINUTE,
    STATUS_DISABLED,
    STATUS_NO_PLAN,
    STATUS_RUNNING,
    STATUS_WAITING_FOR_PLAN,
    STATUS_WAITING_TO_START,
)
from .helpers.general import get_parameter

_LOGGER = logging.getLogger(__name__)


@dataclass
class ScheduledBlock:
    """One contiguous ON block, as returned by POST /api/schedule."""

    start_utc: datetime
    end_utc: datetime
    eur_per_mwh: float | None = None

    def contains(self, moment: datetime) -> bool:
        """Whether moment falls inside this block."""
        return self.start_utc <= moment < self.end_utc


@dataclass
class SpotBuddyPlan:
    """The committed plan for one device, plus the ambient price state."""

    zone_name: str | None = None
    scheduled: bool = False
    blocks: list[ScheduledBlock] = field(default_factory=list)
    current_price: float | None = None
    price_level: str | None = None
    fetched_at: datetime | None = None

    def block_at(self, moment: datetime) -> ScheduledBlock | None:
        """The block covering moment, if any."""
        return next((b for b in self.blocks if b.contains(moment)), None)

    def next_block(self, moment: datetime) -> ScheduledBlock | None:
        """The first block starting after moment, if any."""
        upcoming = sorted(
            (b for b in self.blocks if b.start_utc >= moment),
            key=lambda b: b.start_utc,
        )
        return upcoming[0] if upcoming else None


class SpotBuddyCoordinator(DataUpdateCoordinator[SpotBuddyPlan]):
    """Fetches the plan on a schedule and drives entity state off it."""

    def __init__(self, hass: HomeAssistant, config_entry: ConfigEntry) -> None:
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            # Refreshes are event-driven (see the time listeners below), not polled.
            update_interval=None,
        )
        self.config_entry = config_entry
        self.platforms: list[str] = []
        self.listeners: list = []

        # Connection settings, from the config flow.
        self.base_url: str = str(get_parameter(config_entry, CONF_BASE_URL, "")).rstrip(
            "/"
        )
        self.latitude: float = float(
            get_parameter(config_entry, CONF_LATITUDE, hass.config.latitude)
        )
        self.longitude: float = float(
            get_parameter(config_entry, CONF_LONGITUDE, hass.config.longitude)
        )

        # Task settings, owned by the config entities and restored by them on
        # startup. These are the fields of one task in the schedule request.
        self.enabled: bool = True
        self.continuous_block: bool = False
        self.duration_hours: float = DEFAULT_DURATION_HOURS
        self.ready_by: time | None = dt_util.parse_time(DEFAULT_READY_BY)
        self.unavailable_from: time | None = None
        self.unavailable_to: time | None = None

        # Re-evaluate the relay on every 15-minute slot boundary.
        self.listeners.append(
            async_track_time_change(
                hass, self._async_tick, minute=[0, 15, 30, 45], second=0
            )
        )
        # Re-fetch the plan after midnight and after the day-ahead prices publish.
        self.listeners.append(
            async_track_time_change(
                hass,
                self._async_scheduled_refresh,
                hour=PLAN_REFRESH_HOURS_UTC,
                minute=PLAN_REFRESH_MINUTE,
                second=0,
            )
        )

    def unsubscribe_listeners(self) -> None:
        """Drop every time listener. Called on unload."""
        for unsub in self.listeners:
            unsub()
        self.listeners = []

    async def _async_update_data(self) -> SpotBuddyPlan:
        """Fetch the committed plan from the backend.

        TODO: call POST /api/schedule with the task built from the config
        entities, and GET /api/schedule/status for the price colour. Until the
        API client lands, an empty plan keeps the entities alive and honest.
        """
        _LOGGER.debug("SpotBuddyCoordinator._async_update_data (not implemented)")
        return SpotBuddyPlan(fetched_at=dt_util.utcnow())

    async def _async_scheduled_refresh(self, date_time: datetime | None = None) -> None:
        """Time-triggered plan refresh."""
        await self.async_request_refresh()

    async def async_config_updated(self) -> None:
        """A config entity changed; the committed plan no longer matches it."""
        _LOGGER.debug("SpotBuddyCoordinator.async_config_updated")
        await self.async_request_refresh()

    async def _async_tick(self, date_time: datetime | None = None) -> None:
        """Push the new slot's state out to the entities."""
        self.async_update_listeners()

    @property
    def is_running(self) -> bool:
        """Whether the appliance should be on right now."""
        if not self.enabled or self.data is None:
            return False
        return self.data.block_at(dt_util.utcnow()) is not None

    @property
    def status(self) -> str:
        """A coarse, language-independent state for automations."""
        if not self.enabled:
            return STATUS_DISABLED

        plan = self.data
        if plan is None or plan.fetched_at is None:
            return STATUS_WAITING_FOR_PLAN

        now = dt_util.utcnow()
        if plan.block_at(now) is not None:
            return STATUS_RUNNING
        if plan.next_block(now) is not None:
            return STATUS_WAITING_TO_START
        return STATUS_NO_PLAN

    @property
    def plan_age(self) -> timedelta | None:
        """How long ago the plan was fetched."""
        if self.data is None or self.data.fetched_at is None:
            return None
        return dt_util.utcnow() - self.data.fetched_at
