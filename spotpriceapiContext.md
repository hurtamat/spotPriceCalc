ENTSO-E Transparency Platform — Day-Ahead Prices Integration Notes
Purpose: Fetch day-ahead electricity spot prices (per bidding zone) to drive a load-scheduling/optimization product. Whole-Europe scope.
Access / auth

API access is not self-service. Request it by emailing transparency@entsoe.eu with "RESTful API access" in the subject + your registered email in the body. After approval, a token-generation button appears in My Account Settings.
Auth = a securityToken passed as a query parameter (no OAuth/Bearer). Keep it server-side; never expose in frontend or paste in shared URLs. Rotate if leaked.
Base URL: https://web-api.tp.entsoe.eu/api

The day-ahead query

documentType=A44 selects day-ahead prices (this is the only param that picks "day-ahead").
in_Domain and out_Domain are BOTH set to the same bidding-zone EIC code (they differ only for cross-border flow queries, not prices).
periodStart / periodEnd in format yyyyMMddHHmm, in UTC.
Example: ...?securityToken=XXX&documentType=A44&in_Domain=10YCZ-CEPS-----N&out_Domain=10YCZ-CEPS-----N&periodStart=202607130000&periodEnd=202607140000
Optional: try adding &processType=A01 to constrain to day-ahead server-side (bonus, not a substitute for client-side filtering).

Response format & structure

Response is XML (Publication_MarketDocument), namespace urn:iec62325.351:tc57wg16:451-3:publicationdocument:7:3.
Prices are in EUR/MWh. Divide by 10 for ct/kWh.
Data lives in TimeSeries → Period → Point, each Point has position + price.amount.
On error/no data (bad date, unknown domain), returns an Acknowledgement_MarketDocument with a <Reason><text> — handle this distinctly.

Critical parsing rules (all must be handled):

Multiple TimeSeries per response. A response can contain many <TimeSeries>. Two reasons they multiply: (a) one per delivery day — querying a 2-day window returns 2+ series per market; (b) different markets/auctions mixed in (see rule 2). Loop all, but filter.
Filter to day-ahead only — an A44 response mixes markets. Discriminate on contract_MarketAgreement.type:

A01 = day-ahead → KEEP
A07 = intraday auctions → DROP (e.g. Spain returns 1 day-ahead + several intraday IDA sessions, each an A07 series numbered by classificationSequence_AttributeInstanceComponent.position).
Intraday is the wrong market for day-ahead scheduling — must be excluded or prices get silently corrupted.


Germany (DE-LU) EXAA duplicate. DE-LU publishes two day-ahead auctions: the main SDAC price (gate closure 12:00) and a separate EXAA 10:15 auction. Both may appear as day-ahead. Prefer the SDAC series = the one with NO classificationSequence_AttributeInstanceComponent.position element. The EXAA/secondary carries that sequence marker.

General rule: group day-ahead series by delivery day; within each day, pick the series without a classificationSequence position; fall back to first if needed. → one authoritative curve per day.


curveType=A03 carry-forward. Positions may be sparse — an omitted position means "same price as the previous position." Don't assume positions are contiguous 1..N. Walk every slot 1..slotCount and carry the last seen price forward to fill gaps. (Slot count = period duration ÷ resolution.)
15-minute resolution. Since 30 Sept 2025 the day-ahead market is 15-min (resolution=PT15M), so a full day = 96 points, not 24. Design storage for quarter-hourly. A PT60M/24-point result on a recent date means you got the hourly fallback — verify/log resolution + point count per day. (Some days may also publish both PT60M and PT15M versions of the same day — prefer PT15M.)
UTC → local time. Period start is UTC. E.g. 2026-07-12T22:00Z = local midnight in CEST (UTC+2). Position 1 = local 00:00. Convert each slot to the zone's local time using the zone's IANA timezone (e.g. Europe/Prague). Getting this offset wrong shifts every price into the wrong slot — the most common ENTSO-E bug. Store StartUtc as the DB key; derive local for display.

Bidding zones / domains

"Domain" = bidding zone = uniform-price area. Identified by 16-char EIC codes (dashes are literal, e.g. 10YCZ-CEPS-----N, 10YSK-SEPS-----K, 10Y1001A1001A82H for DE-LU).
Authoritative code lists: ENTSO-E RESTful API user guide Appendix A; the Transparency Platform "Area List with EIC" article; and the downloadable EIC master XML (entsoe.eu → Energy Identification Codes). Filter to BZN function entries.
"Country ≠ zone": some countries split into multiple bidding zones (Sweden SE1–SE4, Norway NO1–NO5, Denmark DK1/DK2, Italy multiple), each a separate price/row. Many EIC codes in the file are virtual/interconnector/aggregate zones (e.g. GB(IFA), IT-North-CH, defunct DE-AT-LU, CZ+DE+SK) or non-coupled neighbors — not real consumer zones; test each with a live A44 query and keep only those returning real day-ahead data.

Alternatives / notes

EPEX SPOT's own feed is typically licensed/paid for retail use. ENTSO-E is the free pan-European source. National NEMOs also publish domestic day-ahead: OTE (CZ), OKTE (SK).
Day-ahead vs intraday: day-ahead = set once ~12:45 CET day before, fixed, known in advance → the market you want for scheduling. Intraday = continuous trading during delivery day, updates dynamically → NOT for planning.
If preferred, the Python library entsoe-py handles fetch + parse and returns clean data (pandas), letting you skip manual XML parsing entirely — worth considering if a Python service owns the fetch.

Parser implementation target (if in .NET): LINQ to XML (XDocument). Selection pipeline: filter contract_MarketAgreement.type == "A01" → group by delivery day → prefer series without classificationSequence position (SDAC over EXAA) → per chosen series, walk 1..slotCount with A03 carry-forward → map position→UTC→local → emit (StartUtc, StartLocal, EUR/MWh, ct/kWh).

This is how the api looks for example its int eh example.xml file - we basically want the one without the <classificationSequence_AttributeInstanceComponent.position>int</classificationSequence_AttributeInstanceComponent.position>

