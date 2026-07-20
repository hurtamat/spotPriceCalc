using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace spotPriceCalc.Migrations
{
    /// <inheritdoc />
    public partial class RemoveLegacyItalianZones : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "bidding_zones",
                keyColumn: "Id",
                keyValue: 39);

            migrationBuilder.DeleteData(
                table: "bidding_zones",
                keyColumn: "Id",
                keyValue: 40);

            migrationBuilder.DeleteData(
                table: "bidding_zones",
                keyColumn: "Id",
                keyValue: 42);

            migrationBuilder.DeleteData(
                table: "bidding_zones",
                keyColumn: "Id",
                keyValue: 43);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "bidding_zones",
                columns: new[] { "Id", "Code", "Latitude", "Longitude", "Name", "TimeZoneId" },
                values: new object[,]
                {
                    { 39, "10Y1001A1001A699", 40.63m, 17.94m, "Italy Brindisi", "Europe/Rome" },
                    { 40, "10Y1001A1001A72K", 41.46m, 15.55m, "Italy Foggia", "Europe/Rome" },
                    { 42, "10Y1001A1001A76C", 37.16m, 15.18m, "Italy Priolo", "Europe/Rome" },
                    { 43, "10Y1001A1001A77A", 39.57m, 16.63m, "Italy Rossano", "Europe/Rome" }
                });
        }
    }
}
