---
title: "Jest: Passing custom arguments"
date: "2019-02-04T15:00:00.000Z"
published: true
description: "In the post i'll show how to pass custom command line arguments to test suits run by Jest framework."
tags: javascript, nodejs, jest, testing
canonical_url: "https://medium.com/@nickcis/jest-passing-custom-arguments-d44ef3f2defb"
---

*Tl;dr; In the post i’ll show how to pass custom command line arguments to test suits run by [Jest framework](https://jestjs.io/).*

Lately i’ve using [Tescafe](https://github.com/DevExpress/testcafe) for doing some end to end test (for those who doesn’t know, it is a Node.js tool to automate end-to-end web testing) and i’ve really like the proposed way to deal with configuration.

Basically, Tescafe has this question in their faq: [*How do I work with configuration files and environment variables?*](https://devexpress.github.io/testcafe/faq/#how-do-i-work-with-configuration-files-and-environment-variables) in which they just tell you _“use an argument parser library to parse custom commands”_.

![](https://cdn-images-1.medium.com/max/2000/0*srDDLeoAqdYFom2M)

Who would imagine that having custom command line arguments would be something so simple!.

## First try: Run jest with any argument

So, for the first try, i’ll just run jest with any command line argument and see if it could be parsed.

![](https://cdn-images-1.medium.com/max/3072/1*QscsY2G7CSZilvE-670vJA.png)

Unluckily, things got a little more complicated. Apparently Jest validates, CLI parameters and throws an exception when it finds one that it doesn’t recognize.

![](https://cdn-images-1.medium.com/max/2000/0*yUH3H-Qa4wu0dEq6.gif)

## Second try: Google to the rescue?

When the quick idea doesn’t work, the following step is to google for a solution!.

![](https://cdn-images-1.medium.com/max/2000/1*wwwoWNQv1un_jp73ssyBpg.png)

Ay, yay 🎉!, there was a feature request for this: [*New Feature: Forward unknown command line arguments to jest.config.js*](https://github.com/facebook/jest/issues/6316). Although, this looked very promising (for a moment i was hyped), it turns out to be rather disappointing:

> Disabling unknown CLI commands was a conscious decision, to align Jest with a lot of UNIX tools, and we’re not going back. We believe this makes sense.
>
> As you already mentioned, this is possible using env variables and I don’t see it being more verbose than a CLI flag. I can’t see any added value by this proposal, but even more config options to maintain.
>
> Sorry to be a bearer of bad news, but I’m going to close this.
>
> Thanks for taking the time to prepare a nice feature request, appreciated! Looking forward to more proposals or bug fixes :)

I know that allowing any unknown CLI commands is a bad decision. But, i want to be able to define custom CLI commands, not to allow the user to throw any random text into the cli!.

## The third time’s the charm

You may call me a little stubborn, but, i’ll have to figure out how to run my tests with custom command line arguments!

As I couldn’t let Jest know that the command was executed with custom arguments, i’ll have to do something before jest was executed. One idea that came to my mind was that another way of running a nodejs binary is requiring it from another file.

So, I could parse, modify *process.argv* and then require the jest runner. The package encharged of the command line interface is called, you won’t imagine, [*jest-cli*](https://github.com/facebook/jest/tree/master/packages/jest-cli). So, that package will be the one I’m going to require.

My idea is to make a custom runner, read *process.argv*, remove custom arguments and then require *jest-cli *binary in order to trick jest that is run with known commands.

```javascript
'use strict';

const config = {
  custom: 'command',
  flag: false,
};
const argv = process.argv.slice(0, 2);

// Naive argv parsing
process.argv
  .reduce((cmd, arg) => {
    if (cmd) {
      config[cmd] = arg;
      return;
    }

    if (arg.startsWith('--')) {
      const sub = arg.substring('--'.length);
      if (Object.keys(config).includes(sub)) {
        if (typeof config[sub] === 'boolean') {
          config[cmd] = true;
          return;
        }

        return sub;
      }
    }

    argv.push(arg)
  });

// Setting real ARGV
process.argv = argv;

// Calling jest runner
require('jest-cli/bin/jest');
```

When try to run it:

![](https://cdn-images-1.medium.com/max/2000/1*sUrcUPzk_Qqa15FAKWxciQ.png)

🎉 Yay!, It works! 🎉

## Custom arguments parsed, So what?

We have custom argument parsed, but, now we need those configuration params on the tests.

As far as i known, the only thing shared across the runner and tests are environmental variables, so it’s my best bet to share configuration. I’ll just modify the runner to create a new env variable called *__CONFIGURATION*, and then parse it on tests.

```js
// Runner storing configuration on env

'use strict';

const config = {
  custom: 'command',
  flag: false,
};
const argv = process.argv.slice(0, 2);

// Naive argv parsing
process.argv
  .reduce((cmd, arg) => {
    if (cmd) {
      config[cmd] = arg;
      return;
    }

    if (arg.startsWith('--')) {
      const sub = arg.substring('--'.length);
      if (Object.keys(config).includes(sub)) {
        if (typeof config[sub] === 'boolean') {
          config[cmd] = true;
          return;
        }

        return sub;
      }
    }

    argv.push(arg)
  });

// Store configuration on env
process.env.__CONFIGURATION = JSON.stringify(config);

// Setting real ARGV
process.argv = argv;

// Calling jest runner
require('jest-cli/bin/jest');
```

```js
// Example test reading configuration from env

const config = JSON.parse(process.env.__CONFIGURATION);

it('example', () => {
  expect(config.custom).toEqual('command');
});
```

If I run it:

![](https://cdn-images-1.medium.com/max/2028/1*hrMn3emLTvHd-aBYhA3NsQ.png)

It works correctly!.

Jest doesn’t complain about extra arguments, and test got params!.

*Note*: Configuration can also be used on jest’s configuration file (ie: *jest.config.js, etc*)

## Further work

Although, the proposed objective has been fulfilled, some things can be improved:

* Argument parsing is done in a very naive way (no single dash arguments are supported!), it might be better to just use a argument parsing library than to reinvent the wheel.

* Tests have to repeat the parsing logic for the env variable, this could be abstracted on a module and require it.

* Printing custom arguments help text when the help flag is used.
