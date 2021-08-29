import SparkMD5 from "spark-md5";
import { StrokeFactory } from "stroke";
import { StrokeStorage } from "./StrokeStorage.js";
import { HistoryItem, HistoryItemFactory } from "./HistoryItem.js";

function strokeMap(item) {
    item.stroke = StrokeFactory(item.stroke);

    return item;
}

export function MakeHash(data) {
    return SparkMD5.hash(JSON.stringify(data), true);
}

/*
 * History
 *
 * NOTE: all stored elements in the history will be of the form
 * { action: action, data: data }
 *
 * we need to decide if we will expose the action to outside consumers
 * for now, just be very clear about expectations for each public function
 */
export class History {
    storage = new StrokeStorage();
    clearStack = [];
    undoStack = [];

    constructor() {
    }

    has(id) { return this.storage.has(id); }

    // No data is transferred
    clearScreen() {
        this.undoStack.length = 0;

        this.clearStack.push(this.storage.items);
        this.storage.flush();

    }

    get pickled() {
        return { hash: this.hash, data: JSON.stringify(this._dataOnly) };
    }

    unpickle(hash, string) {
        if (!this.equals(hash)) {
            let data = JSON.parse(string);

            this.undoStack = data.undoStack.map(HistoryItemFactory);
            this.storage.rebuild(data.strokes.map(HistoryItemFactory));
        } else {
            console.log("hashes match, not unpickling");
        }
    }

    // Only the data. not any of the nice functions
    get _dataOnly() {
        return {
            undoStack: this.undoStack,
            strokes: this.storage.items,
        }
    }

    // TODO: describe exactly why this is used and what the expectations are
    // data is being transferred out
    get data() {
        throw "NOT USED";
        return {
            undoStack: this.undoStack,
            strokeOrder: this.strokeOrder.map(StrokeFactory),
        }

    }

    // No data is transferred
    equals(hash) {
        return this.hash === hash;
    }

    // this is history-to-history transfer, so keep the internals as is
    toString() {
        throw "NOT USED";
        return JSON.stringify(this.data);
    }

    // this is history-to-history hash, so keep the internals as is
    get hash() {
        return MakeHash(this._dataOnly);
    }

    // TODO: describe exactly why this is used and what the expectations are
    // data is being transferred out
    get readOnlyHistory() {
        throw "NOT USED";
    }

    get readonlyStrokes() {
        return this.storage.items;
    }

    // TODO: describe exactly why this is used and what the expectations are
    // data is being transferred out
    get hashedData() {
        throw "NOT USED";
        let data = this.data;

        return {
            hash: this.hash,
            undoStack: data.undoStack,
            strokeOrder: data.strokeOrder,
        }
    }

    // TODO: describe exactly why this is used and what the expectations are
    // data is being transferred in from another history. keep internals
    rebuild(data) {
        throw "NOT USED";

        this.undoStack.length = 0;
        this.undoStack.push(...data.undoStack);

        // TODO: Should we assume that the data is objects already? YES
        this.storage.rebuild(data.strokeOrder);
        this.strokeOrder.length = 0;
        this.strokeOrder.push(...data.strokeOrder.map(StrokeFactory));
    }

    // Data is being added. The stroke can come in, but it needs to be stored
    // as an action object
    newStroke(stroke) {
        if (this.storage.has(stroke.id)) {
            throw "ERROR: can't newStroke. stroke exists";
        }

        stroke = StrokeFactory(stroke);

        this.storage.pushAction(stroke.id, "stroke", stroke);
    }

    addStroke(id, x, y, tiltX, tiltY) {
        if (this.storage.has(id)) {
            let stroke = this.storage.getData(id);
            stroke.addXY(x, y, tiltX, tiltY);

            return stroke;
        } else {
            throw "ERROR: can't addStroke. stroke NOT exists";
        }
    }

    endStroke(id) {
        this.undoStack.length = 0;

        if (this.storage.has(id)) {
            return this.storage.getData(id);
        } else {
            throw "ERROR: can't endStroke. stroke NOT exists";
        }
    }

    add(action, data) {
        throw "TRY NOT to use add in History";
        // Adding a new action/stroke will kill the undo future
        /*
        this.undoStack.length = 0;

        if (action === "stroke" && data.id in this.strokes) {
        } else if (action === "stroke") {
            this.strokes[data.id] = data;
        }

        this.strokeOrder.push({ action: action, stroke: data});
        */
    }

    // TODO: Carefull, we now require the input to be an id, not a full stroke
    remove(id) {
        this.undoStack.length = 0;

        if (this.storage.has(id)) {
            let stroke = this.storage.getData(id);
            stroke._deleted = true;

            this.storage.pushAction(-1, 'delete', stroke);
        } else {
            throw "ERROR: can't delete stroke, does not exist";
        }
    }

    undo() {
        if (this.storage.length == 0 && this.clearStack.length > 0) {
            this.storage.rebuild(this.clearStack.pop());
            //this.storage.pushAction(-1, "clear");
            //this.undoStack.pushAction(-1, "clear");
            this.undoStack.push(new HistoryItem(-1, "clear"));
        } else if (this.storage.length > 0) {
            let item = this.storage.pop();

            if (item.action === "delete") {
                item.data._deleted = false;
            }

            this.undoStack.push(item);
        }
    }

    redo() {
        if (this.undoStack.length > 0) {
            let item = this.undoStack.pop();

            if (item.action === 'clear') {
                this.clearStack.push(this.storage.items);
                this.storage.flush();
            } else if (item.action === 'delete') {
                // handle the delete action
                let stroke = item.data;

                stroke._deleted = true;
                this.storage.push(item);
            } else if (item.action === 'stroke') {
                this.storage.push(item);
            } else {
                throw "OOPS, we missed an action";
            }
        }
    }
}
