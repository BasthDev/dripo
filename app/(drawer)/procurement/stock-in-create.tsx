import { Redirect, useLocalSearchParams } from 'expo-router';

export default function StockInCreateRedirect() {
  const { preselect } = useLocalSearchParams<{ preselect?: string }>();
  return (
    <Redirect
      href={
        preselect
          ? { pathname: '/procurement/stock', params: { focus: preselect } }
          : '/procurement/stock'
      }
    />
  );
}
