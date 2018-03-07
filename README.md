# ![LINE](https://github.com/GoogleX133/LINE-WebChat/blob/master/public/images/small.png) LINE SquareBot
[![NPM](https://img.shields.io/badge/npm-%3E=%205.5.0-blue.svg)](https://nodejs.org/) [![Node](https://img.shields.io/badge/node-%3E=%208.0.0-brightgreen.svg)](https://nodejs.org/) [![AUR](https://img.shields.io/aur/license/yaourt.svg)](https://github.com/GoogleX133/LINE-SquareBot/blob/master/LICENSE) [![LINE](https://img.shields.io/badge/line-%207.18-brightgreen.svg)](http://line.me/) [![Contact Me](https://img.shields.io/badge/chat-on%20line-1bacbc.svg)](http://line.me/ti/p/MB6mnZWbu_) [![Version](https://img.shields.io/badge/alpha-4.2-brightgreen.svg)](https://github.com/GoogleX133/LINE-SquareBot)<br><br>
LINE Messaging Web Platform

----

PAGES
=====

- [What is LINE SquareBot ?](#what-is-line-squarebot-)
    - [Keyword](#keyword)
    - [Upcoming Feature](#upcoming-update)
- [Requirement](#requirement)
- [Installation](#)
    - [Windows](#windows-installation)
    - [Linux](#linux-installation)
    - [Termux](#linux-installation)
    - [Setup](#setup)
- [How to run](#how-to-run)
- [How to get ChatMid](#how-to-get-chatmid)


## What is LINE SquareBot ?

LINE SquareBot is *LINE Messaging Bot* for Square

## Keyword

Type `help` to see the keyword

## Upcoming Update

- More keyword

<br><br>
If you have an idea for new feature, you can contact [me](http://line.me/ti/p/MB6mnZWbu_).

## Requirement

This repo require a [NodeJS](https://nodejs.org/) >= 8.0.0.

## Windows Installation

First of all, you need to install [Git](https://git-scm.com/download/win) & [NodeJS](https://nodejs.org/). Then open your git bash, and follow this:<br>
```sh
$ git clone https://github.com/GoogleX133/LINE-SquareBot.git
$ cd LINE-SquareBot
$ npm i
```

## Linux Installation

```sh
$ apt-get update
$ apt-get install git-all
$ apt-get install nodejs-current
$ git clone https://github.com/GoogleX133/LINE-SquareBot.git
$ cd LINE-SquareBot
$ npm i
```

## Setup

After you install with `npm i `, all you have to do is insert your squareChatMid on `var sqChatMid = 'HERE';` at index.js

## How to run

You can run with<br>
```sh
$ node ./index.js
```

## How to get ChatMid

Simple, you just run this script<br>
```sh
$ node ./examples/getchatmid.js
```
