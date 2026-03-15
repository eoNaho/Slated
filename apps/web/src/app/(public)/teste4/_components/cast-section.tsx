"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye, Edit } from "lucide-react";
import Image from "next/image";

// Types adapted simplified
export interface CastMember {
  id: string;
  name: string;
  character?: string;
  profilePath?: string;
  profilePhoto?: string; // fallback
  order?: number;
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  job?: string;
  profilePath?: string;
  photo?: string; // fallback
  department?: string;
}

interface CastSectionProps {
  cast: CastMember[];
  crew: CrewMember[];
  type?: string;
}

export function CastSection({ cast, crew }: CastSectionProps) {
  return (
    <div>
      <Tabs defaultValue="cast" className="w-full">
        <TabsList className="bg-white/5 w-full justify-start rounded-md mb-6">
          <TabsTrigger
            value="cast"
            className="data-[state=active]:bg-purple-600/30 text-zinc-400 data-[state=active]:text-white"
          >
            Elenco ({cast.length})
          </TabsTrigger>
          <TabsTrigger
            value="crew"
            className="data-[state=active]:bg-purple-600/30 text-zinc-400 data-[state=active]:text-white"
          >
            Equipe Técnica ({crew.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cast">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {cast.map((person, index) => (
              <div key={index} className="group relative">
                <div className="aspect-[2/3] overflow-hidden rounded-md mb-3 relative bg-zinc-800">
                  <Image
                    src={
                      person.profilePath ||
                      person.profilePhoto ||
                      "/placeholder.svg?height=300&width=200"
                    }
                    alt={person.name}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      asChild
                      variant="secondary"
                      size="sm"
                      className="h-8 text-xs"
                    >
                      <Link href={`#`}>
                        <Eye className="w-3 h-3 mr-1" />
                        Ver
                      </Link>
                    </Button>
                  </div>
                </div>

                <h3 className="font-medium text-white text-sm">
                  {person.name}
                </h3>
                <p className="text-xs text-zinc-500">{person.character}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="crew">
          <div className="space-y-8">
            {[
              { title: "Direção", role: "Director" },
              { title: "Roteiro", role: "Writer" },
              { title: "Produção", role: "Producer" },
              { title: "Fotografia", role: "Cinematographer" },
              { title: "Edição", role: "Editor" },
              { title: "Música", role: "Composer" },
            ].map((department) => {
              const departmentCrew = crew.filter(
                (person) => person.role === department.role
              );
              if (departmentCrew.length === 0) return null;

              return (
                <div key={department.role}>
                  <h3 className="text-xl font-bold text-white mb-4">
                    {department.title}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {departmentCrew.map((person, index) => (
                      <div key={index} className="group relative">
                        <div className="aspect-[2/3] overflow-hidden rounded-md mb-3 relative bg-zinc-800">
                          <Image
                            src={
                              person.profilePath ||
                              person.photo ||
                              "/placeholder.svg?height=300&width=200"
                            }
                            alt={person.name}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                          />

                          {/* Overlay */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              asChild
                              variant="secondary"
                              size="sm"
                              className="h-8 text-xs"
                            >
                              <Link href={`#`}>
                                <Eye className="w-3 h-3 mr-1" />
                                Ver
                              </Link>
                            </Button>
                          </div>
                        </div>

                        <h3 className="font-medium text-white text-sm">
                          {person.name}
                        </h3>
                        <p className="text-xs text-zinc-500">
                          {person.job || person.department}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
