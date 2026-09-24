# blogserver

NestJS + TypeScript API for the blog application. Migrated from a plain Express + Mongoose
app; every route path and response body is unchanged, so the existing client works against
it without modification.

## Requirements

- Node.js 20+
- A MongoDB database (Atlas or local)

## Setup

```bash
npm install
cp .env.example .env   # then fill in MONGO_URI and JWT_SECURE_CODE
```

The environment is validated at boot by [src/config/env.validation.ts](src/config/env.validation.ts),
so a missing or malformed variable fails immediately with a readable message rather than at
the first request.

| Variable          | Required | Default                                                     | Purpose                              |
| ----------------- | -------- | ----------------------------------------------------------- | ------------------------------------ |
| `MONGO_URI`       | yes      | —                                                           | MongoDB connection string            |
| `JWT_SECURE_CODE` | yes      | —                                                           | Secret used to sign access tokens    |
| `PORT`            | no       | `8000`                                                      | Port the API listens on              |
| `JWT_EXPIRES_IN`  | no       | `9d`                                                        | Access token lifetime                |
| `CORS_ORIGINS`    | no       | `http://localhost:5173,https://blogclient-chi.vercel.app`   | Comma separated allowed browser origins |

## Scripts

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run start:dev` | Watch mode with automatic reload      |
| `npm start`         | Run once, no watcher                  |
| `npm run build`     | Compile TypeScript into `dist/`       |
| `npm run start:prod`| Run the compiled output               |
| `npm test`          | Jest unit tests                       |
| `npm run lint`      | ESLint with `--fix`                   |
| `npm run format`    | Prettier over `src/`                  |

## Layout

```
src/
├── main.ts                     Bootstrap: global prefix, CORS, validation pipe, error filter
├── app.module.ts               Root module: config, Mongoose connection, feature modules
├── common/                     Cross-cutting pieces shared by every feature
│   ├── decorators/             @Roles(), @CurrentUser()
│   ├── enums/                  UserRole
│   ├── filters/                Maps thrown errors to { message, success: false }
│   ├── guards/                 JwtAuthGuard, RolesGuard
│   └── interfaces/             Response envelopes, JWT payload, authenticated request
├── config/                     Typed configuration and environment validation
└── modules/
    ├── auth/                   Register, login, JWT strategy
    ├── blogs/                  Blog CRUD
    └── users/                  Profile, user administration
```

Each feature module holds its own `schemas/` (Mongoose models) and `dto/` (validated request
bodies), so a feature can be read or moved as one unit.

## API

All routes are served under the `/api/v1` prefix.

### Auth — `/api/v1/auth`

| Method | Path        | Auth | Body                                                            | Response                                   |
| ------ | ----------- | ---- | --------------------------------------------------------------- | ------------------------------------------ |
| POST   | `/register` | —    | `email`, `userName`, `phoneNumber`, `password`, `profilepic?`, `role?` | `{ message, status: true }`           |
| POST   | `/login`    | —    | `email`, `password`                                             | `{ message, success, data: { ...user, token } }` |

### Blogs — `/api/v1/blog`

| Method | Path                     | Auth        | Response                          |
| ------ | ------------------------ | ----------- | --------------------------------- |
| GET    | `/getallblog`            | public      | `{ message, blogs, success }`     |
| GET    | `/getsingleblog/:id`     | public      | `{ message, data, success }`      |
| GET    | `/getblogbytopic/:topic` | public      | `{ message, data, success }`      |
| POST   | `/create`                | role `user` | `{ message, success }`            |
| PUT    | `/editblog/:id`          | role `user` | `{ message, data, success }`      |
| DELETE | `/deleteblog/:id`        | role `user` | `{ message, success }`            |

### Users — `/api/v1/user`

| Method | Path             | Auth         | Response                                |
| ------ | ---------------- | ------------ | --------------------------------------- |
| GET    | `/me`            | role `user`  | `{ success, message, profileDetails }`  |
| PUT    | `/edituser/:id`  | role `user`  | `{ success, message, userDetails }`     |
| GET    | `/getallusers`   | role `admin` | `{ success, message, users }`           |
| DELETE | `/deleteuser/:id`| role `admin` | `{ success, message }`                  |

Authenticated routes expect `Authorization: Bearer <token>`.

## Notes on behaviour

- The JWT payload is still `{ id, userName }`, so tokens issued by the old Express server
  remain valid.
- `JwtStrategy` loads the user from MongoDB on every request, so a role change takes effect
  immediately instead of waiting for the token to expire.
- `ValidationPipe` runs with `whitelist: true`, so properties no DTO declares are stripped
  from request bodies before a controller sees them.
- Password hashes never reach a response: they are excluded by the query in `UsersService`
  and by a `toJSON` transform on the user schema.
