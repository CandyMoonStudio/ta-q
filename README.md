# Question Generator (TypeAnswer)

This folder is dedicated to **question generation, validation, and TSV→JSON conversion** only.
It is intentionally isolated so it can be extracted into a separate repository in the future.

## Purpose
- Editing format is **TSV** (human-readable for authors).
- Game input format is **JSON** (auto-generated).
- **Manual copy** is currently required to move JSON into the game data.
- This folder **does not fetch** anything from the network.
- The existing game code is **not modified** by design.

## Usage
```sh
cd question_gen
node src/build.mjs
```

## Notes
- Output files are generated under `question_gen/out/`.
- This folder is self-contained and avoids dependencies whenever possible.
