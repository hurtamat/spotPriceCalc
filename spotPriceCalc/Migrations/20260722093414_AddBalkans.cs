using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace spotPriceCalc.Migrations
{
    /// <inheritdoc />
    public partial class AddBalkans : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "bidding_zones",
                columns: new[] { "Id", "Code", "Latitude", "Longitude", "Name", "TimeZoneId" },
                values: new object[,]
                {
                    { 44, "10YAL-KESH-----5", 41.33m, 19.82m, "Albania", "Europe/Tirane" },
                    { 45, "10YCS-CG-TSO---S", 42.44m, 19.26m, "Montenegro", "Europe/Podgorica" },
                    { 46, "10Y1001C--00100H", 42.66m, 21.17m, "Kosovo", "Europe/Belgrade" },
                    { 47, "10YMK-MEPSO----8", 41.99m, 21.43m, "North Macedonia", "Europe/Skopje" },
                    { 48, "10YCS-SERBIATSOV", 44.79m, 20.45m, "Serbia", "Europe/Belgrade" },
                    { 49, "10Y1001A1001A59C", 53.35m, -6.26m, "Ireland (SEM)", "Europe/Dublin" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "bidding_zones",
                keyColumn: "Id",
                keyValue: 44);

            migrationBuilder.DeleteData(
                table: "bidding_zones",
                keyColumn: "Id",
                keyValue: 45);

            migrationBuilder.DeleteData(
                table: "bidding_zones",
                keyColumn: "Id",
                keyValue: 46);

            migrationBuilder.DeleteData(
                table: "bidding_zones",
                keyColumn: "Id",
                keyValue: 47);

            migrationBuilder.DeleteData(
                table: "bidding_zones",
                keyColumn: "Id",
                keyValue: 48);

            migrationBuilder.DeleteData(
                table: "bidding_zones",
                keyColumn: "Id",
                keyValue: 49);
        }
    }
}
