---
date: 2019-03-05T16:42:19.000+00:00
title: Razzle + Firebase = ❤️
description: ''
tags: ''
published: false
canonical_url: ''

---
Recently, I've been playing around with [Firebase](https://firebase.google.com/ "Firebase"). As it has a nice free tier, is a good platform to prototype apps. It has free file hosting, functions and a database (nosql).

I'm used to using [Razzle](https://github.com/jaredpalmer/razzle "Razzle Js") for my React projects (you get SSR and HMR for free!), so I though it could be my starting point.

Checking out examples I've found one called [_Firebase functions_](https://github.com/jaredpalmer/razzle/tree/master/examples/with-firebase-functions), which I've thought it would resolve all my problems.

**\[\[\[ INSERT IMAGE OF EXAMPLES \]\]\]**

It isn't my objective to take credit from the contributor who submitted that example, but, I've found out that the developer experience wasn't as good as I've expected. Some points I in which that example could be improved:

* Firebase [quick start](https://firebase.google.com/docs/functions/get-started) and [examples](https://github.com/firebase/functions-samples) follow the convention of using a sub package (in a folder named _functions_) for firebase functions, instead of using the same package for hosting, functions, database, etc.
* While developing, I would like to use native firebase emulator, instead of spinning up an express server.
* Support source maps in order to have better error's traces in development
* I would prefer defining firebase functions in a more explicit way, instead of having the index file outside of the src directory.