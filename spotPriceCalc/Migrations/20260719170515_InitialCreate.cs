using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace spotPriceCalc.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "bidding_zones",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    TimeZoneId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Latitude = table.Column<decimal>(type: "numeric(9,6)", nullable: false),
                    Longitude = table.Column<decimal>(type: "numeric(9,6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bidding_zones", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "spot_prices",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    From = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    To = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Price = table.Column<decimal>(type: "numeric(10,4)", nullable: false),
                    BiddingZoneId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_spot_prices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_spot_prices_bidding_zones_BiddingZoneId",
                        column: x => x.BiddingZoneId,
                        principalTable: "bidding_zones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "temperature_readings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TimeUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TemperatureC = table.Column<decimal>(type: "numeric(6,2)", nullable: false),
                    BiddingZoneId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_temperature_readings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_temperature_readings_bidding_zones_BiddingZoneId",
                        column: x => x.BiddingZoneId,
                        principalTable: "bidding_zones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "bidding_zones",
                columns: new[] { "Id", "Code", "Latitude", "Longitude", "Name", "TimeZoneId" },
                values: new object[,]
                {
                    { 1, "10YAT-APG------L", 48.21m, 16.37m, "Austria", "Europe/Vienna" },
                    { 2, "10YBE----------2", 50.85m, 4.35m, "Belgium", "Europe/Brussels" },
                    { 3, "10YCA-BULGARIA-R", 42.70m, 23.32m, "Bulgaria", "Europe/Sofia" },
                    { 4, "10YCH-SWISSGRIDZ", 46.95m, 7.45m, "Switzerland", "Europe/Zurich" },
                    { 5, "10YCZ-CEPS-----N", 50.08m, 14.44m, "Czech Republic", "Europe/Prague" },
                    { 6, "10YSK-SEPS-----K", 48.15m, 17.11m, "Slovakia", "Europe/Bratislava" },
                    { 7, "10Y1001A1001A82H", 52.52m, 13.41m, "Germany-Luxembourg", "Europe/Berlin" },
                    { 8, "10Y1001A1001A39I", 59.44m, 24.75m, "Estonia", "Europe/Tallinn" },
                    { 9, "10YES-REE------0", 40.42m, -3.70m, "Spain", "Europe/Madrid" },
                    { 10, "10YFI-1--------U", 60.17m, 24.94m, "Finland", "Europe/Helsinki" },
                    { 11, "10YFR-RTE------C", 48.85m, 2.35m, "France", "Europe/Paris" },
                    { 12, "10YGR-HTSO-----Y", 37.98m, 23.73m, "Greece", "Europe/Athens" },
                    { 13, "10YHR-HEP------M", 45.81m, 15.98m, "Croatia", "Europe/Zagreb" },
                    { 14, "10YHU-MAVIR----U", 47.50m, 19.04m, "Hungary", "Europe/Budapest" },
                    { 15, "10YLT-1001A0008Q", 54.69m, 25.28m, "Lithuania", "Europe/Vilnius" },
                    { 16, "10YLV-1001A00074", 56.95m, 24.11m, "Latvia", "Europe/Riga" },
                    { 17, "10YNL----------L", 52.37m, 4.90m, "Netherlands", "Europe/Amsterdam" },
                    { 18, "10YPL-AREA-----S", 52.23m, 21.01m, "Poland", "Europe/Warsaw" },
                    { 19, "10YPT-REN------W", 38.72m, -9.14m, "Portugal", "Europe/Lisbon" },
                    { 20, "10YRO-TEL------P", 44.43m, 26.10m, "Romania", "Europe/Bucharest" },
                    { 21, "10YSI-ELES-----O", 46.05m, 14.51m, "Slovenia", "Europe/Ljubljana" },
                    { 22, "10Y1001A1001A44P", 65.58m, 22.15m, "Sweden SE1", "Europe/Stockholm" },
                    { 23, "10Y1001A1001A45N", 62.39m, 17.31m, "Sweden SE2", "Europe/Stockholm" },
                    { 24, "10Y1001A1001A46L", 59.33m, 18.07m, "Sweden SE3", "Europe/Stockholm" },
                    { 25, "10Y1001A1001A47J", 55.60m, 13.00m, "Sweden SE4", "Europe/Stockholm" },
                    { 26, "10YNO-1--------2", 59.91m, 10.75m, "Norway NO1", "Europe/Oslo" },
                    { 27, "10YNO-2--------T", 58.15m, 8.00m, "Norway NO2", "Europe/Oslo" },
                    { 28, "10YNO-3--------J", 63.43m, 10.39m, "Norway NO3", "Europe/Oslo" },
                    { 29, "10YNO-4--------9", 69.65m, 18.96m, "Norway NO4", "Europe/Oslo" },
                    { 30, "10Y1001A1001A48H", 60.39m, 5.32m, "Norway NO5", "Europe/Oslo" },
                    { 31, "10YDK-1--------W", 56.16m, 10.20m, "Denmark DK1", "Europe/Copenhagen" },
                    { 32, "10YDK-2--------M", 55.68m, 12.57m, "Denmark DK2", "Europe/Copenhagen" },
                    { 33, "10Y1001A1001A73I", 45.46m, 9.19m, "Italy North", "Europe/Rome" },
                    { 34, "10Y1001A1001A70O", 43.77m, 11.26m, "Italy Centre-North", "Europe/Rome" },
                    { 35, "10Y1001A1001A71M", 41.90m, 12.50m, "Italy Centre-South", "Europe/Rome" },
                    { 36, "10Y1001A1001A788", 40.85m, 14.27m, "Italy South", "Europe/Rome" },
                    { 37, "10Y1001A1001A74G", 39.22m, 9.12m, "Italy Sardinia", "Europe/Rome" },
                    { 38, "10Y1001A1001A75E", 38.12m, 13.36m, "Italy Sicily", "Europe/Rome" },
                    { 39, "10Y1001A1001A699", 40.63m, 17.94m, "Italy Brindisi", "Europe/Rome" },
                    { 40, "10Y1001A1001A72K", 41.46m, 15.55m, "Italy Foggia", "Europe/Rome" },
                    { 41, "10Y1001C--00096J", 38.91m, 16.59m, "Italy Calabria", "Europe/Rome" },
                    { 42, "10Y1001A1001A76C", 37.16m, 15.18m, "Italy Priolo", "Europe/Rome" },
                    { 43, "10Y1001A1001A77A", 39.57m, 16.63m, "Italy Rossano", "Europe/Rome" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_bidding_zones_Code",
                table: "bidding_zones",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_spot_prices_BiddingZoneId_From",
                table: "spot_prices",
                columns: new[] { "BiddingZoneId", "From" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_temperature_readings_BiddingZoneId_TimeUtc",
                table: "temperature_readings",
                columns: new[] { "BiddingZoneId", "TimeUtc" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "spot_prices");

            migrationBuilder.DropTable(
                name: "temperature_readings");

            migrationBuilder.DropTable(
                name: "bidding_zones");
        }
    }
}
