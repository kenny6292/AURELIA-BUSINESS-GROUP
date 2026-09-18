# AURELIA BUSINESS GROUP

Premium enterprise business platform concept for investment, real estate, technology and business solutions.

## Stack
- React
- Vite
- JavaScript
- CSS
- Lucide React

## Development
`npm install`
`npm run dev`

## Vision
This repository is the foundation for a production-grade digital business platform. Future phases will add authentication, CRM, investment and property data, client portal, admin dashboard, APIs, payments, analytics and security.

## Production backend

The platform now includes a real PostgreSQL-backed API under `/api`.

### Required environment variables

Copy `.env.example` into your deployment environment and set:

- `DATABASE_URL` — PostgreSQL connection string.
- `JWT_SECRET` — long random secret used to sign authentication tokens.
- `NODE_ENV=production`.

### Database

Run `database/schema.sql` against the PostgreSQL database before using registration, login, enquiries, client workspaces, or administration.

Register the first account normally, then promote it to administrator with:

```sql
UPDATE users SET role='admin' WHERE email='admin@yourdomain.com';
```

### Real functionality

- Client registration and login
- Password hashing with bcrypt
- JWT authentication
- Role-based client/admin access
- PostgreSQL persistence
- Public enquiry submission
- Client investment/document/enquiry retrieval
- Admin live metrics and enquiry pipeline
- Live property inventory API

No demo credentials or local demo sessions are used by the production authentication flow.

### Deployment

The frontend is Vite and the API is Vercel-compatible. Configure the database and environment variables in the deployment provider before opening the platform to real users.
