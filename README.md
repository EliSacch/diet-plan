# DietPlan

Monorepo with a FastAPI backend and a React Vite frontend.


[Backend documentation](backend/README.md)


[Frontend documentation](frontend/README.md)


## Table of content


- [Features](#features)
    - [Google Authentication](#google-authentication)


## Features

### Google authentication

Sign in with Google using the openid and email scopes. The backend stores a server session and sends it as an httpOnly cookie. The same Google account always maps to the same user.

[Back to the top](#dietplan)