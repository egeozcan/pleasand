# Great works: known limits

Open limits of the wonders work, as merged to master. Each says what happens, what was done about it, and why anything was left.

## Natural valleys run out of room

Without a forced site, a valley with no flat, open ground fits only about one or two of the six to nine wonder ideas. Most ideas need a site that is level, dry, out of the way of stone, and reachable on foot from the houses. Natural valleys rarely have that many, so the rest of the ideas stay unbuilt.

- **Status:** open. Left as it is on purpose: loosening the site rules would mean building on ground the rest of the code treats as unsafe.
- **What would change it:** relaxing the rules for one idea at a time, or making levelling and clearing a build step in its own right.

## Foundry roof is hot and unwalkable during a cast

The sealed foundry's floating brick roof reaches about 252–286°. That is above the 90° scald threshold but not lethal. During a cast the roof cannot be walked on. A hungry villager who is cut off from food waits (the hunger hold) rather than crossing it.

- **Status:** unchanged. This follows the round-25 principle: remove the hazard instead of fencing it in. A cooler roof would need a different material.

## Plain-village saves carry extra keys

A save from a village with no wonder ideas contains six keys that master does not write: `kiln`, `lastSwim`, `swims`, `tales`, `wAny` and `wDone`. Gameplay in a plain village matches master exactly. The keys are real state (`tales` remembers the idea discoveries), so dropping them would change what a reloaded village remembers. Older saves without them load with defaults, which the code already handles.

- **Status:** unchanged. Needs a decision on whether a reloaded plain village should remember its idea tales.

## Blasts with full rings (fixed)

A blast's ring was rolled on the village's dice even when eight rings were already going, so a plain village diverged from master after such a blast. Plain villages now roll the ring exactly as master does, and a village with great works rolls it on the side dice.

- **Status:** fixed. `test/wonders.js` "a plain village's blasts with the rings full roll what master rolls" fails on the pre-fix code and passes now.
- **Not covered:** concrete in a big blast still rolls the village's dice (one roll for each concrete cell caught in the crater). Plain villages should not have concrete, but this has not been checked.

## Kiln lime is slower in the test

The kiln test for lime takes about 11,000 ticks, against about 7,000 before. The test passes.

- **Status:** not investigated.

## Dry-footing fallback (tested)

The fallback in `wEvict` (wonders.js), which puts a person out on dry footing when no release spot exists, now has a test: "in a great work's stone with no way out to the floor, and a sealed chamber above". It fails if the fallback is removed.

## Wonders artifact

The "Pleasand Wonders" page has its status updated to the final state. Its pictures and card text are from earlier rounds and have not been re-rendered.

## Open findings from a pi review of 4fbc88b (P2)

- `wonders.js` eviction fallback (~line 582): the check is `navStand === 1`, which pi says tests solid support, not dry footing. A person put out below a flooded ledge can drown on the next tick. pi reproduced this on the pre-fix and final revisions; not yet checked here.
- `wonders.js` lens repair (~line 776): with a pane already in hand, the repair still sends a villager to make charcoal and burns two logs. pi's repro took 514 ticks where the earlier version took 20.
