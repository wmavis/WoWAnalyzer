import SPELLS from 'common/SPELLS';
import CoreChanneling from 'parser/shared/modules/Channeling';
import { ApplyDebuffEvent, CastEvent, BeginCastEvent } from 'parser/core/Events';
import Ability from 'parser/core/modules/Ability';

/**
 * Mind Flay and Void Torrent don't reveal in the combatlog when channeling begins and ends, this fabricates the required events so that ABC can handle it properly.
 */
const CHANNEL_ABILITIES = [ // This used where checks are done for all channeled spriest abilities
  SPELLS.MIND_FLAY.id,
  SPELLS.MIND_SEAR.id,
  SPELLS.VOID_TORRENT_TALENT.id,
];

class Channeling extends CoreChanneling {

  mindBlastCastStart?: BeginCastEvent;

  // Have to track the begin cast event to store mind blasts for dark thought procs
  on_byPlayer_begincast(event: BeginCastEvent) {
    if (event.ability.guid === SPELLS.MIND_BLAST.id) {
      this.mindBlastCastStart = event;
    }
    super.on_byPlayer_begincast(event);
  }

  on_byPlayer_cast(event: CastEvent) {
    if (event.ability.guid === SPELLS.VOID_TORRENT_TALENT.id) {
      this.beginChannel(event);
      return;
    }
    if (event.ability.guid === SPELLS.MIND_FLAY.id || event.ability.guid === SPELLS.MIND_SEAR.id) {
      // Completely ignore this with regards to channeling since we use `applybuff` to track channel start, and this cast-event can occur as ticks too
      return;
    }
    super.on_byPlayer_cast(event);
  }

  // We can't use the `cast`-event for Mind Flay as this event can occur in the log during channel as ticks too
  on_byPlayer_applydebuff(event: ApplyDebuffEvent) {
    if (event.ability.guid === SPELLS.MIND_FLAY.id || event.ability.guid === SPELLS.MIND_SEAR.id) {
      this.beginChannel(event);
    }
  }

  cancelChannel(event: CastEvent, ability: Ability) {
    if (CHANNEL_ABILITIES.some(ability => this.isChannelingSpell(ability))) {
      if (event.ability.guid === SPELLS.MIND_BLAST.id) {
        if (!this.mindBlastCastStart) { // If there is no cast start set, can't check timestamp
          return;
        }
        const channelingTime = event.timestamp - this.mindBlastCastStart.timestamp;
        const isInstantCast = channelingTime < 100;
        if (isInstantCast) { // If the cast is completed with 0.1s of starting, it's an instant done while channeling
          return;
        }
      }

      // If a channeling spell is "canceled" it was actually just ended, so if it looks canceled then instead just mark it as ended
      this.endChannel(event);
    } else {
      super.cancelChannel(event, ability);
    }
  }
}

export default Channeling;
