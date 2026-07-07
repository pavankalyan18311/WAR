export type TicketStatus = 'open' | 'in_progress' | 'resolved';

export type SupportTicket = {
  id: string;
  subject: string;
  category: 'order' | 'return' | 'payment' | 'product' | 'other';
  message: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
};

export type TicketReply = {
  id: string;
  ticketId: string;
  author: 'customer' | 'support';
  message: string;
  createdAt: string;
};

export const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 'SUP-1024',
    subject: 'Order not delivered yet',
    category: 'order',
    message: 'My order TXN-2026-9104 still shows shipped. Need update on expected delivery.',
    status: 'in_progress',
    createdAt: '2026-06-10T10:15:00Z',
    updatedAt: '2026-06-11T08:30:00Z',
  },
  {
    id: 'SUP-1018',
    subject: 'Need size exchange help',
    category: 'return',
    message: 'Received M but need L. Please guide exchange process.',
    status: 'resolved',
    createdAt: '2026-06-06T14:00:00Z',
    updatedAt: '2026-06-07T11:20:00Z',
  },
];

export const INITIAL_REPLIES: TicketReply[] = [
  {
    id: 'r-1',
    ticketId: 'SUP-1024',
    author: 'customer',
    message: 'Hi team, my order has been in shipped state since yesterday. Could you check please?',
    createdAt: '2026-06-10T10:20:00Z',
  },
  {
    id: 'r-2',
    ticketId: 'SUP-1024',
    author: 'support',
    message: 'Thanks for reaching out. We checked with the courier and your package is out for line-haul movement. Expected delivery in 1-2 days.',
    createdAt: '2026-06-10T12:40:00Z',
  },
  {
    id: 'r-3',
    ticketId: 'SUP-1018',
    author: 'customer',
    message: 'I need exchange from M to L. The fit is tight.',
    createdAt: '2026-06-06T14:10:00Z',
  },
  {
    id: 'r-4',
    ticketId: 'SUP-1018',
    author: 'support',
    message: 'Exchange request approved. Pickup has been scheduled for tomorrow. You will receive the replacement within 3-4 business days.',
    createdAt: '2026-06-06T16:20:00Z',
  },
];
