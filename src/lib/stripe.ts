import { loadStripe } from "@stripe/stripe-js";

const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

export const stripePromise = pk && !pk.includes("pk_test_xxx")
  ? loadStripe(pk)
  : Promise.resolve(null);