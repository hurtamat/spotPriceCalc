using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace spotPriceCalc.Migrations
{
    /// <inheritdoc />
    public partial class AddSpotPriceQuantile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Quantile",
                table: "spot_prices",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Quantile",
                table: "spot_prices");
        }
    }
}
