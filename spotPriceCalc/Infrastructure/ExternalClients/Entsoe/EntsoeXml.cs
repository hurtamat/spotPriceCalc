using System.Xml.Serialization;

namespace spotPriceCalc.Infrastructure.ExternalClients.Entsoe;

// Deserializes an ENTSO-E A44 response into the DTOs. The default namespace is passed to the serializer so
// every element resolves without tagging each DTO property.
public static class EntsoeXml
{
    public const string Namespace = "urn:iec62325.351:tc57wg16:451-3:publicationdocument:7:3";

    private static readonly XmlSerializer Serializer = new(typeof(PublicationMarketDocument), Namespace);

    public static PublicationMarketDocument Deserialize(string xml)
    {
        using var reader = new StringReader(xml);
        return (PublicationMarketDocument)Serializer.Deserialize(reader)!;
    }
}
