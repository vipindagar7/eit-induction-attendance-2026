import Image from "next/image";
import AttendanceForm from "@/components/AttendanceForm";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center flex flex-col items-center">
        <Image
          src="/logo.png"
          alt="ECHELON Institute of Technology"
          width={360}
          height={145}
          className="w-56 sm:w-64 h-auto mb-2"
          priority
        />
        <p className="text-white/60 text-sm mt-1">Event Attendance</p>
      </div>
      <AttendanceForm />
    </main>
  );
}
