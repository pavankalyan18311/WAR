import { redirect } from 'next/navigation';

// Support requests go through the contact form (saved for Admin → Messages).
export default function SupportPage() {
  redirect('/contact');
}
