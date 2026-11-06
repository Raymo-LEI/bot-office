# Research note (pointer)

The canonical English research note for official bot roster / status / avatar interfaces lives here:

- [pixel-office/docs/official-bot-api-research.md](../pixel-office/docs/official-bot-api-research.md)

For how the optional local status bridge works on your own machine, see [pixel-office/README.md](../pixel-office/README.md) and [pixel-office/docs/connect-status-notes.md](../pixel-office/docs/connect-status-notes.md).

**Summary:** there is no official browser-pollable status or avatar API for this static page. Live status, if used at all, comes from a local Python bridge on the user's own machine that signs in with its own browser session and queries an unpublished backend; otherwise the page uses mock data.
