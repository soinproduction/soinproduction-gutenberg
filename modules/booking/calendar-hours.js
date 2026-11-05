/** Shared time axis spans opening hours of the days in the visible range. */
export function calendarHours(weekly, from, to) {
  let rows;
  if (from && to) {
    rows=[];
    const end=new Date(to.slice(0,10)+'T00:00:00Z');
    for (const day=new Date(from.slice(0,10)+'T00:00:00Z');day<end;day.setUTCDate(day.getUTCDate()+1)) {
      const row=weekly[day.getUTCDay() || 7];
      if(row)rows.push(row);
    }
  } else rows=Object.values(weekly).filter(Boolean);
  if(!rows.length)return {open:'00:00',close:'01:00',closed:true};
  return {open:rows.map(row=>row.open).sort()[0],close:rows.map(row=>row.close).sort().at(-1),closed:false};
}
