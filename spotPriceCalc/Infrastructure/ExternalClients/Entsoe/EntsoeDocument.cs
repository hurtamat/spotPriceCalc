using System.Xml.Serialization;

namespace spotPriceCalc.Infrastructure.ExternalClients.Entsoe;

// Plain DTOs that mirror the ENTSO-E A44 XML 1:1. No logic, no date math — just the shape of the
// document, so XmlSerializer can fill them straight from the response. Element names match the XML
// exactly (dots and all).

[XmlRoot("Publication_MarketDocument")]
public class PublicationMarketDocument
{
    [XmlElement("TimeSeries")]
    public List<TimeSeriesXml> TimeSeries { get; set; } = [];
}

public class TimeSeriesXml
{
    [XmlElement("contract_MarketAgreement.type")]
    public string ContractType { get; set; } = "";

    // Absent on the authoritative (SDAC) series, present on secondary auctions (EXAA / intraday).
    // Nullable => stays null when the element isn't in the XML, which is exactly how we tell them apart.
    [XmlElement("classificationSequence_AttributeInstanceComponent.position")]
    public int? ClassificationSequencePosition { get; set; }

    [XmlElement("Period")]
    public List<PeriodXml> Periods { get; set; } = [];

    public bool IsDayAhead => ContractType == "A01";
}

public class PeriodXml
{
    [XmlElement("timeInterval")]
    public TimeIntervalXml TimeInterval { get; set; } = new();

    [XmlElement("resolution")]
    public string Resolution { get; set; } = "";

    [XmlElement("Point")]
    public List<PointXml> Points { get; set; } = [];
}

public class TimeIntervalXml
{
    [XmlElement("start")] public string Start { get; set; } = "";
    [XmlElement("end")] public string End { get; set; } = "";
}

public class PointXml
{
    [XmlElement("position")] public int Position { get; set; }
    [XmlElement("price.amount")] public decimal PriceAmount { get; set; }
}
