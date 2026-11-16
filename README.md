# ToneBird interaction demo

A local, interactive recreation of the ToneBird reply assistant in a WhatsApp-style conversation.

## Run

Open `index.html` in a browser. No build step or dependencies are required.

The page contains two independent scenarios:

- **Normal:** read the conversation, compare three replies, adjust wording, and insert a reply into the composer.
- **Limited access:** the conversation displays normal English and emoji, while the captured context contains simulated recognition errors. Review or replace the context, then generate and copy a reply.

The green orb keeps its small resting size and expands as the pointer approaches. The black satellite opens the simulated voice idea flow.

## Recording

`tonebird-demo.mp4` shows both interaction flows. The recording predates the final shortening of the comparison button to “Compare”.

## Files

- `index.html` — both conversation scenes and assistant markup.
- `tonebird.js` — interaction and demonstration logic.
- `tonebird-upgrade.css` — assistant styling.
- `assets/tonebird-original/` — UI geometry, material tokens, and vector icons recreated from the reference product.

This is a UI prototype with predefined replies. Conversation reading, voice input, and insertion restrictions are simulated. There is no backend or persistent chat storage.
