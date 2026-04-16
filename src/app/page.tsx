import Link from "next/link";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";

export default function HomePage() {
  return (
    <section className="mx-auto w-full max-w-4xl">
      <Card className="space-y-4">
        <h2 className="text-2xl font-semibold">SICOP Agente</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Panel para gestionar revisiones, tareas y el asistente del proyecto SICOP.
        </p>
        <div className="flex gap-3">
          <Link href="/dashboard">
            <Button>Ir al dashboard</Button>
          </Link>
          <Link href="/tareas">
            <Button variant="ghost">Ver tareas</Button>
          </Link>
        </div>
      </Card>
    </section>
  );
}
