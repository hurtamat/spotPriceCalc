using System.Xml.Serialization;

namespace spotPriceCalc.Infrastructure.ExternalClients.Entsoe;

// ENTSO-E answers with this instead of a Publication_MarketDocument when it won't serve the request.
[XmlRoot("Acknowledgement_MarketDocument")]
public class AcknowledgementMarketDocument
{
    [XmlElement("Reason")]
    public ReasonXml Reason { get; set; } = new();
}

public class ReasonXml
{
    [XmlElement("code")] public string Code { get; set; } = "";
    [XmlElement("text")] public string Text { get; set; } = "";
}

// Thrown when ENTSO-E acknowledges the request but declines to answer it. Never worth retrying.
public class EntsoeAcknowledgementException : Exception
{
    public string Code { get; }

    public EntsoeAcknowledgementException(string code, string text)
        : base($"ENTSO-E declined the request (reason {code}): {text}")
    {
        Code = code;
    }
}
