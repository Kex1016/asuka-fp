# Asuka

A Discord bot made for [Gakkou Culture Club](https://anilist.co/user/GakkouCultureClub), a server I help out in.

## Features

- Typescript with **esbulid/tsx**
- Database with **SQLite**
- Application Commands with [**Discord-FP**](https://github.com/SonMooSans/discord-fp)

## Installation

### Clone this repository

`git clone https://github.com/Kex1016/asuka-fp.git`

### Init

I am using **pnpm** by default

`pnpm install`

### Configurationa

Copy `.env.example` to `.env`, and edit it according to your names.

### File structure

| Path       | Description                    |
| ---------- | ------------------------------ |
| index.ts   | Where to start the application |
| ./commands | All application commands       |
| ./routes   | API Routes                     |
| ./public   | Static files for the API       |
| .env       | Environment Variables          |

## Run the Project

### Watch Mode

`pnpm run dev`

### Run without watch

`pnpm run start`
