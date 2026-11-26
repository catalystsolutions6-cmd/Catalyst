// Change the marketplace name here. Everything on the site reads from this file.
export const brand = {
  name: "Barq",
  tagline: "Pakistan's tech market, online",
  company: "Catalyst Solutions",
  companyUrl: "https://www.catsols.com",
  supportPhone: "+92 300 0000000",
  supportEmail: "support@example.com",
  currency: "PKR",
  freeShippingOver: 50000,
  shippingFee: 250,
};

export function formatPKR(n: number) {
  return "Rs " + Math.round(n).toLocaleString("en-PK");
}
