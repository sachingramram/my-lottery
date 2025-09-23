import Link from "next/link";

const START_YEAR = 1996;
const END_YEAR = 2025;
const TYPES = ["night","day"] as const;
const years = Array.from({length: END_YEAR-START_YEAR+1},(_,i)=>END_YEAR-i);

export default function Home() {
  return (
    <>
      <header className="mx-auto bg-[var(--yellow)] text-[var(--red)] text-center border-strong border-[var(--red)] py-4 md:py-8">
        <h1 className="text-3xl md:text-6xl font-extrabold">JAI METRO</h1>
        <p className="text-lg md:text-3xl mt-1">YOUR LUCK LOTTERY NUMBER</p>
      </header>

      <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Mini title="Jai Metro Day" rows={[
          { number:"158 / 4", date:"23-09-2025", time:"12:30:00 PM" },
          { number:"248 / 4", date:"23-09-2025", time:"01:30:00 PM" },
        ]}/>
        <div className="flex justify-center">
          <figure className="border-strong border-[var(--red)] bg-[var(--yellow)] p-2">
            <img src="/ganeshji.jfif"
                 alt="idol" className="w-full max-w-[320px] h-auto object-cover"/>
          </figure>
        </div>
        <Mini title="Jai Metro Night" rows={[
          { number:"235 / 0", date:"23-09-2025", time:"08:01:00 PM" },
        ]}/>
      </section>

      <nav className="mt-8 space-y-3 md:space-y-6">
        {years.map(y => TYPES.map(t => (
          <Link key={`${y}-${t}`}
            href={`/chart/${y}/${t}`}
            className="block text-center bg-[var(--yellow)] text-[var(--red)] text-xl md:text-3xl border-strong border-[var(--red)] py-4 md:py-6 hover:opacity-90">
            {`Jai Metro ${t[0].toUpperCase()+t.slice(1)} Panel Chart ${y}`}
          </Link>
        )))}
        <Link href="/admin" className="block text-center underline text-yellow-200">Admin Login</Link>
      </nav>
    </>
  );
}

function Mini({ title, rows }:{title:string, rows:{number:string;date:string;time:string}[]}) {
  return (
    <div className="bg-[var(--yellow)] border-strong border-[var(--red)]">
      <div className="text-center py-2 md:py-3 text-lg md:text-2xl text-[var(--red)] border-b-strong border-[var(--red)]">{title}</div>
      <table className="w-full text-[var(--red)] text-sm md:text-lg table-fixed">
        <thead><tr className="text-center">{["Number","Date","Time"].map((h,i)=>
          <th key={i} className="py-2 md:py-3 border-b-strong border-[var(--red)] border-r-strong last:border-r-0">{h}</th>)}
        </tr></thead>
        <tbody>{rows.map((r,i)=>(
          <tr key={i} className="text-center">
            <Td>{r.number}</Td><Td>{r.date}</Td>
            <Td><div className="leading-tight"><div>{r.time.split(" ")[0]}</div><div className="uppercase">{r.time.split(" ")[1]}</div></div></Td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
function Td({ children }:{children:React.ReactNode}) {
  return <td className="py-3 md:py-5 border-b-strong border-[var(--red)] border-r-strong last:border-r-0 px-2">{children}</td>;
}
