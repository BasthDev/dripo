import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ReceiveStockRedirect() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return (
    <Redirect
      href={
        id
          ? { pathname: '/procurement/stock', params: { focus: id } }
          : '/procurement/purchases'
      }
    />
  );
}
