import { Redirect } from 'expo-router';

export default function PurchaseOrdersRedirect() {
  return <Redirect href="/procurement/purchases?tab=orders" />;
}
