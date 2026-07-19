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
                    Latitude = table.Column<double>(type: "double precision", nullable: false),
                    Longitude = table.Column<double>(type: "double precision", nullable: false)
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
                    { 1, "10YAT-APG------L", 48.210000000000001, 16.370000000000001, "Austria", "Europe/Vienna" },
                    { 2, "10YBE----------2", 50.850000000000001, 4.3499999999999996, "Belgium", "Europe/Brussels" },
                    { 3, "10YCA-BULGARIA-R", 42.700000000000003, 23.32, "Bulgaria", "Europe/Sofia" },
                    { 4, "10YCH-SWISSGRIDZ", 46.950000000000003, 7.4500000000000002, "Switzerland", "Europe/Zurich" },
                    { 5, "10YCZ-CEPS-----N", 50.079999999999998, 14.44, "Czech Republic", "Europe/Prague" },
                    { 6, "10YSK-SEPS-----K", 48.149999999999999, 17.109999999999999, "Slovakia", "Europe/Bratislava" },
                    { 7, "10Y1001A1001A82H", 52.520000000000003, 13.41, "Germany-Luxembourg", "Europe/Berlin" },
                    { 8, "10Y1001A1001A39I", 59.439999999999998, 24.75, "Estonia", "Europe/Tallinn" },
                    { 9, "10YES-REE------0", 40.420000000000002, -3.7000000000000002, "Spain", "Europe/Madrid" },
                    { 10, "10YFI-1--------U", 60.170000000000002, 24.940000000000001, "Finland", "Europe/Helsinki" },
                    { 11, "10YFR-RTE------C", 48.850000000000001, 2.3500000000000001, "France", "Europe/Paris" },
                    { 12, "10YGR-HTSO-----Y", 37.979999999999997, 23.73, "Greece", "Europe/Athens" },
                    { 13, "10YHR-HEP------M", 45.810000000000002, 15.98, "Croatia", "Europe/Zagreb" },
                    { 14, "10YHU-MAVIR----U", 47.5, 19.039999999999999, "Hungary", "Europe/Budapest" },
                    { 15, "10YLT-1001A0008Q", 54.689999999999998, 25.280000000000001, "Lithuania", "Europe/Vilnius" },
                    { 16, "10YLV-1001A00074", 56.950000000000003, 24.109999999999999, "Latvia", "Europe/Riga" },
                    { 17, "10YNL----------L", 52.369999999999997, 4.9000000000000004, "Netherlands", "Europe/Amsterdam" },
                    { 18, "10YPL-AREA-----S", 52.229999999999997, 21.010000000000002, "Poland", "Europe/Warsaw" },
                    { 19, "10YPT-REN------W", 38.719999999999999, -9.1400000000000006, "Portugal", "Europe/Lisbon" },
                    { 20, "10YRO-TEL------P", 44.43, 26.100000000000001, "Romania", "Europe/Bucharest" },
                    { 21, "10YSI-ELES-----O", 46.049999999999997, 14.51, "Slovenia", "Europe/Ljubljana" },
                    { 22, "10Y1001A1001A44P", 65.579999999999998, 22.149999999999999, "Sweden SE1", "Europe/Stockholm" },
                    { 23, "10Y1001A1001A45N", 62.390000000000001, 17.309999999999999, "Sweden SE2", "Europe/Stockholm" },
                    { 24, "10Y1001A1001A46L", 59.329999999999998, 18.07, "Sweden SE3", "Europe/Stockholm" },
                    { 25, "10Y1001A1001A47J", 55.600000000000001, 13.0, "Sweden SE4", "Europe/Stockholm" },
                    { 26, "10YNO-1--------2", 59.909999999999997, 10.75, "Norway NO1", "Europe/Oslo" },
                    { 27, "10YNO-2--------T", 58.149999999999999, 8.0, "Norway NO2", "Europe/Oslo" },
                    { 28, "10YNO-3--------J", 63.43, 10.390000000000001, "Norway NO3", "Europe/Oslo" },
                    { 29, "10YNO-4--------9", 69.650000000000006, 18.960000000000001, "Norway NO4", "Europe/Oslo" },
                    { 30, "10Y1001A1001A48H", 60.390000000000001, 5.3200000000000003, "Norway NO5", "Europe/Oslo" },
                    { 31, "10YDK-1--------W", 56.159999999999997, 10.199999999999999, "Denmark DK1", "Europe/Copenhagen" },
                    { 32, "10YDK-2--------M", 55.68, 12.57, "Denmark DK2", "Europe/Copenhagen" },
                    { 33, "10Y1001A1001A73I", 45.460000000000001, 9.1899999999999995, "Italy North", "Europe/Rome" },
                    { 34, "10Y1001A1001A70O", 43.770000000000003, 11.26, "Italy Centre-North", "Europe/Rome" },
                    { 35, "10Y1001A1001A71M", 41.899999999999999, 12.5, "Italy Centre-South", "Europe/Rome" },
                    { 36, "10Y1001A1001A788", 40.850000000000001, 14.27, "Italy South", "Europe/Rome" },
                    { 37, "10Y1001A1001A74G", 39.219999999999999, 9.1199999999999992, "Italy Sardinia", "Europe/Rome" },
                    { 38, "10Y1001A1001A75E", 38.119999999999997, 13.359999999999999, "Italy Sicily", "Europe/Rome" },
                    { 39, "10Y1001A1001A699", 40.630000000000003, 17.940000000000001, "Italy Brindisi", "Europe/Rome" },
                    { 40, "10Y1001A1001A72K", 41.460000000000001, 15.550000000000001, "Italy Foggia", "Europe/Rome" },
                    { 41, "10Y1001C--00096J", 38.909999999999997, 16.59, "Italy Calabria", "Europe/Rome" },
                    { 42, "10Y1001A1001A76C", 37.159999999999997, 15.18, "Italy Priolo", "Europe/Rome" },
                    { 43, "10Y1001A1001A77A", 39.57, 16.629999999999999, "Italy Rossano", "Europe/Rome" }
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
