import * as Y from "yjs";
import * as Yawareness from "y-protocols/dist/awareness.cjs";
class SyncDoc {
  constructor(room_id, { channel, owner_id = "0", owner_type }) {
    Object.assign(this, {
      room_id,
      owner_id,
      owner_type,
      channel,
    });

    this.ydoc = new Y.Doc();
    this.ydoc.clientID = owner_id;
    this.awareness = new Yawareness.Awareness(this.ydoc);
    this.ydoc.getMap("root"); //default root object
    this.ssv = Y.encodeStateVector(this.ydoc);
  }

  get isConnected() {
    return !!this.socket;
  }

  get root() {
    return this.ydoc.getMap("root");
  }

  get_diff() {
    let diff = Y.encodeStateAsUpdate(this.ydoc, this.ssv);
    return diff;
  }

  sync(socket, doc_name) {
    if (this.ssv && this.ssv.length === 0) {
      this.ssv = null;
    }

    let diff = Y.encodeStateAsUpdate(this.ydoc, this.ssv);
    if (!(diff.length === 2 && diff[0] === 0 && diff[1] === 0)) {
      // this.socket.emit("sync_user_doc", diff);
      socket.emit("sync", doc_name, diff);
    }
  }

  registerOnUpdate(updateCallback) {
    this.ydoc.on("update", (changes) => {
      if (updateCallback && typeof updateCallback === "function")
        updateCallback(this, changes);
    });
  }

  apply_update(ssv, diff) {
    this.ssv = new Uint8Array(ssv);
    Y.applyUpdate(this.ydoc, new Uint8Array(diff));
    this.ydoc.getMap("root");
  }

  onInit(diff) {
    Y.applyUpdate(this.ydoc, new Uint8Array(diff));
    this.ydoc.getMap("root");
    console.log(this.ydoc.toJSON());
  }

  reset() {
    this.ydoc = new Y.Doc();
    this.ydoc.getMap("root");
  }

  onAwarenessUpdate(updateCallback) {
    this.awareness.on("update", (changes) => {
      console.log("awareness update", changes);
      if (updateCallback && typeof updateCallback === "function")
        updateCallback(this, changes);
    });
  }
}

export default SyncDoc;
