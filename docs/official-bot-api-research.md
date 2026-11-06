# Research note (pointer)

The canonical English research note for official bot roster / status / avatar interfaces lives here:

- [pixel-office/docs/official-bot-api-research.md](../pixel-office/docs/official-bot-api-research.md)

For how the optional local status bridge works on your own machine, see [pixel-office/README.md](../pixel-office/README.md).

**Summary:** there is no official browser-pollable status or avatar API for this static page. Live status, if used at all, comes from a local `grokbot status --json` bridge on the user’s own machine; otherwise the page uses mock data.
