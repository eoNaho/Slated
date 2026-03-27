"use client";

interface Genre {
  id: number;
  name: string;
}

interface GenrePickerProps {
  genres: Genre[];
  selected: number[];
  onChange: (ids: number[]) => void;
  minRequired?: number;
}

export function GenrePicker({ genres, selected, onChange, minRequired = 3 }: GenrePickerProps) {
  const toggle = (id: number) => {
    if (selected.includes(id)) {
      onChange(selected.filter((g) => g !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div>
      <p className="text-sm text-zinc-400 mb-4">
        Select at least {minRequired} genres you enjoy.
      </p>
      <div className="flex flex-wrap gap-2">
        {genres.map((genre) => {
          const isSelected = selected.includes(genre.id);
          return (
            <button
              key={genre.id}
              onClick={() => toggle(genre.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                isSelected
                  ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/30"
                  : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-purple-500/50 hover:text-white"
              }`}
            >
              {genre.name}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-zinc-600 mt-3">
        {selected.length} selected
        {selected.length < minRequired && ` — pick ${minRequired - selected.length} more`}
      </p>
    </div>
  );
}
