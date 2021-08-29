import { StrokeFactory } from "stroke";
import { HistoryItem, HistoryItemFactory } from "./HistoryItem.js";

export class StrokeStorage {
    strokes = {};
    strokeOrder = [];

    constructor() { }

    get length() {
        return this.strokeOrder.length;
    }

    flush() {
        this.strokes = {};
        this.strokeOrder = [];
    }

    get items() {
        return JSON.parse(JSON.stringify(this.strokeOrder)).map(HistoryItemFactory);
    }

    has(id) {
        return (id in this.strokes);
    }

    pop() {
        let item = this.strokeOrder.pop();

        delete this.strokes[item.id];

        return item;
    }

    popAction() {
        return this.popItem().map(x => [x.id, x.action, x.data]);
    }

    getData(id) {
        return id in this.strokes ? this.strokes[id].data : undefined;
    }

    push(item) {
        if (!(item instanceof HistoryItem)) { throw "push item must be HistoryItem" }

        if (item.id > 0) {
            this.strokes[item.id] = item;
        }

        this.strokeOrder.push(item);
    }

    pushAction(id, action, data) {
        this.push(new HistoryItem(id, action, data));
    }

    rebuild(data) {
        this.flush();
        data.forEach(this.push.bind(this));
    }
}
