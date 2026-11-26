#!/bin/sh
# builds the Rust step (src/lib.rs) and puts it, base64, into ../simwasm-bin.js, which index.html loads.
#   wasm/build.sh            the release build
#   wasm/build.sh checked    every grid read and write bounds-checked (a trap, not a quiet wrong cell): for testing
# the toolchain is the one rust-toolchain.toml names: rustup fetches it, and the wasm32 target, when it is wanted
set -e
cd "$(dirname "$0")"
FEATURES=""
if [ "$1" = "checked" ]; then FEATURES="--features checked"; fi
cargo build --release --target wasm32-unknown-unknown $FEATURES
node embed.js target/wasm32-unknown-unknown/release/pleasand_sim.wasm ../simwasm-bin.js
