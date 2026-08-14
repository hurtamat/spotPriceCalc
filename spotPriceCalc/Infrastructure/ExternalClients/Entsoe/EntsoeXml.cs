using System.Xml;
using System.Xml.Serialization;

namespace spotPriceCalc.Infrastructure.ExternalClients.Entsoe;

// Deserializes an ENTSO-E A44 response into the DTOs. The default namespace is passed to the serializer so
// every element resolves without tagging each DTO property.
public static class EntsoeXml
{
    public const string Namespace = "urn:iec62325.351:tc57wg16:451-3:publicationdocument:7:3";
    public const string AcknowledgementNamespace =
        "urn:iec62325.351:tc57wg16:451-1:acknowledgementdocument:7:0";

    private static readonly XmlSerializer Serializer = new(typeof(PublicationMarketDocument), Namespace);

    private static readonly XmlSerializer AckSerializer =
        new(typeof(AcknowledgementMarketDocument), AcknowledgementNamespace);

    public static PublicationMarketDocument Deserialize(string xml)
    {
        using var reader = new StringReader(xml);
        return (PublicationMarketDocument)Serializer.Deserialize(reader)!;
    }

    // True when the body is an Acknowledgement rather than prices. Checked before the status code, because
    // "no matching data" arrives as HTTP 200 and would otherwise blow up in Deserialize. Returns false for
    // anything unrecognisable (an HTML error page, a truncated body) so the caller falls back to the status.
    public static bool TryReadAcknowledgement(string xml, out ReasonXml reason)
    {
        reason = new ReasonXml();

        try
        {
            using var reader = XmlReader.Create(new StringReader(xml));
            if (!reader.MoveToContent().Equals(XmlNodeType.Element) ||
                reader.LocalName != "Acknowledgement_MarketDocument")
                return false;

            reason = ((AcknowledgementMarketDocument)AckSerializer.Deserialize(reader)!).Reason;
            return true;
        }
        catch (Exception ex) when (ex is XmlException or InvalidOperationException)
        {
            return false;
        }
    }
}
