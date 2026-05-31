import { Redirect } from 'expo-router';

/** Hub removed — use drawer Purchasing dropdown. */
export default function ProcurementHubRedirect() {
  return <Redirect href="/procurement/purchases" />;
}
