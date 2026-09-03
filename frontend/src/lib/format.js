import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

export function fmtTime(d) {
  if (!d) return "";
  return dayjs(d).format("HH:mm");
}
export function fmtChatTs(d) {
  if (!d) return "";
  const dt = dayjs(d);
  if (dt.isSame(dayjs(), "day")) return dt.format("HH:mm");
  if (dt.isAfter(dayjs().subtract(7, "day"))) return dt.format("ddd");
  return dt.format("DD/MM/YY");
}
export function fmtRel(d) {
  if (!d) return "";
  return dayjs(d).fromNow();
}
export function initials(name = "") {
  return name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
export function otherParticipant(convo, meId) {
  if (!convo?.participants) return null;
  return convo.participants.find((p) => (p._id || p.id) !== meId) || convo.participants[0];
}
