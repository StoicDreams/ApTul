<webui-data data-page-title="Password Generator" data-page-subtitle="Strong Random Passwords" data-page-description="Generate strong random passwords up to 128 characters, with your choice of letters, numbers, and symbols. Created in your browser and never sent or stored."></webui-data>

<webui-quote theme="title">
Create strong random passwords with your browser's secure random number generator. Passwords are made on your device and are never sent to or stored on any server.
</webui-quote>

<app-password-generator></app-password-generator>

## How It Works

<webui-page-segment elevation="10">
1. **Set the Length**: Choose from 4 to 128 characters. 16 or more is a good choice for most accounts.
1. **Choose the Characters**: Use any mix of uppercase, lowercase, numbers, and symbols. Every type you choose appears at least once.
1. **Generate**: Make one password, or up to 50 at once, and check the strength shown above them.
</webui-page-segment>

### Key Features

<webui-page-segment elevation="10">
- **Secure Randomness**: Uses the browser's cryptographic random number generator, with no bias toward any character.
- **Avoid Look-Alikes**: Leave out characters such as I, l, 1, O, and 0 that are easy to misread.
- **Strength Estimate**: See how many bits of randomness each password has.
- **Private**: Nothing is sent, saved, or logged.
</webui-page-segment>

<app-ad-slot name="content"></app-ad-slot>

## Frequently Asked Questions

<webui-page-segment elevation="10">

### Is it safe to use a password made on a website?

These passwords are made by your own browser and never leave your device. Even so, the safest habit is to save a new password straight into a password manager and not reuse it anywhere else.

### How long should my password be?

At least 16 characters for important accounts. Length adds strength faster than extra symbols, so a longer password with only letters and numbers can be stronger than a short one with symbols.

### What do the strength levels mean?

They are based on bits of randomness, which measure how many guesses an attacker would need. Under 50 bits is weak, 50 to 79 is fair, 80 to 109 is strong, and 110 or more is very strong.

### Why does a site reject some symbols?

Some sites only allow certain symbols. Turn off symbols and make the password longer to keep it just as strong.

</webui-page-segment>

<app-ad-slot name="footer"></app-ad-slot>

<app-related-tools></app-related-tools>
