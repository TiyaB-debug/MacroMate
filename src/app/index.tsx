import { Redirect } from 'expo-router';

// App entry. Once Supabase auth is wired up, this will send signed-in users
// straight to /home and everyone else to /sign-in.
export default function Index() {
  return <Redirect href="/sign-in" />;
}
