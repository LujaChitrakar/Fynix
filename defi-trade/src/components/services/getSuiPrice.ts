import { SuiPriceServiceConnection } from "@pythnetwork/pyth-sui-js";

const connection = new SuiPriceServiceConnection(
  "https://hermes-beta.pyth.network"
);

const priceIds = [
  "50c67b3fd225db8912a424dd4baed60ffdde625ed2feaaf283724f9608fea266",
];

export default async function getSuiPrice() {
  const priceFeeds = await connection.getLatestPriceFeeds(priceIds);

  if (!priceFeeds || priceFeeds.length === 0) {
    console.error("No price feeds returned.");
    return;
  }
  const price = priceFeeds[0].getPriceNoOlderThan(60);
  if (!price) {
    console.error("No recent price found for this price ID.");
    return;
  }
  return price.price;
}

async function main() {
  console.log(await getSuiPrice());
}

main();
