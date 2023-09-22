import { StrokeFactory } from 'drawing-strokes';
export function HistoryItemFactory(data) {
    return new HistoryItem(data.id, data.action, data.data);
}

export class HistoryItem {
    constructor(id, action, data) {
        this.id = id;
        this.action = action;
        if (action === 'stroke') {
            this.data = StrokeFactory(data);
        } else {
            this.data = data;
        }
    }
}
