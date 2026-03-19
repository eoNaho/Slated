'use client'
import { useState, useRef, useCallback } from "react";

const today = new Date();
const dateStr = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function getExt(file) {
  return file.type === "image/png"
    ? "png"
    : file.type === "image/webp"
      ? "webp"
      : "jpg";
}

const DEFAULT_HOST = "http://localhost:8080";

export default function EmailConverter() {
  const [companyName, setCompanyName] = useState("Hotel Donati");
  const [host, setHost] = useState(DEFAULT_HOST);
  const [designImage, setDesignImage] = useState(null);
  const [contentImages, setContentImages] = useState([]);
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState("desktop");
  const [showConfig, setShowConfig] = useState(false);

  const designRef = useRef();
  const contentRef = useRef();

  const renameImages = useCallback((imgs, company) => {
    return imgs.map((img, i) => ({
      ...img,
      newName:
        i === 0
          ? `${company} capa-${dateStr}`
          : `${company} foto ${i}-${dateStr}`,
    }));
  }, []);

  const handleDesignFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const b64 = await fileToBase64(file);
    setDesignImage({
      file,
      b64,
      mediaType: file.type || "image/jpeg",
      ext: getExt(file),
    });
  };

  const handleDesignChange = (e) => handleDesignFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleDesignFile(e.dataTransfer.files[0]);
  };

  const handleContentChange = async (e) => {
    const files = Array.from(e.target.files);
    const processed = await Promise.all(
      files.map(async (file) => {
        const b64 = await fileToBase64(file);
        return {
          file,
          b64,
          mediaType: file.type || "image/jpeg",
          ext: getExt(file),
          originalName: file.name,
          newName: "",
        };
      }),
    );
    setContentImages((prev) => {
      const combined = [...prev, ...processed];
      return renameImages(combined, companyName);
    });
    e.target.value = "";
  };

  const removeContent = (idx) => {
    setContentImages((prev) =>
      renameImages(
        prev.filter((_, i) => i !== idx),
        companyName,
      ),
    );
  };

  const updateCompany = (val) => {
    setCompanyName(val);
    setContentImages((prev) => renameImages(prev, val));
  };

  const generateEmail = async () => {
    if (!designImage) {
      setError("Faça upload do design do e-mail primeiro.");
      return;
    }
    setError("");
    setIsLoading(true);
    setProgress("Conectando ao llama.cpp...");

    try {
      const imageList =
        contentImages.length > 0
          ? `\n\nImagens de conteúdo disponíveis (use como src placeholder):\n${contentImages.map((img, i) => `- [${img.newName}.${img.ext}]`).join("\n")}`
          : "";

      const systemPrompt = `Você é especialista em desenvolvimento de e-mails HTML responsivos compatíveis com Gmail, Outlook e Apple Mail.

REGRAS OBRIGATÓRIAS:
1. Retorne APENAS o código HTML completo (<!DOCTYPE html> até </html>), sem texto extra, sem blocos markdown
2. Use tabelas para estrutura (compatibilidade máxima com Outlook)
3. Estilos inline em todos os elementos
4. E-mail responsivo com @media (max-width: 600px) no bloco <style>
5. Para imagens use: <img src="[nome-da-imagem.jpg]" alt="..." />
6. Replique fielmente: cores, fontes, tamanhos, botões, seções do design
7. Container máximo: 700px centralizado
8. Botões com bordas arredondadas e cores do design
9. Mobile: fontes menores, padding reduzido, imagens 100% de largura`;

      setProgress("Analisando o design com visão computacional...");

      const resp = await fetch(`${host}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "local-model",
          max_tokens: 8000,
          temperature: 0.1,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${designImage.mediaType};base64,${designImage.b64}`,
                  },
                },
                {
                  type: "text",
                  text: `Analise este design de e-mail e gere o HTML completo responsivo que replique fielmente o layout, cores, tipografia e todos os elementos visuais.${imageList}\n\nRetorne APENAS o código HTML, sem markdown, sem explicações.`,
                },
              ],
            },
          ],
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Erro ${resp.status}: ${errText.slice(0, 200)}`);
      }

      setProgress("Processando resposta do modelo...");
      const data = await resp.json();

      let html = data.choices?.[0]?.message?.content || "";
      html = html
        .replace(/^```html\s*/i, "")
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "")
        .trim();

      if (!html.includes("<") || !html.includes(">")) {
        throw new Error(
          "Resposta vazia ou inválida. Verifique se o modelo suporta visão e está rodando.",
        );
      }

      if (
        !html.toLowerCase().includes("<!doctype") &&
        !html.toLowerCase().includes("<html")
      ) {
        html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
      }

      setGeneratedHtml(html);
      setActiveTab("preview");
    } catch (err) {
      if (
        err.message.includes("fetch") ||
        err.message.includes("Failed") ||
        err.message.includes("NetworkError")
      ) {
        setError(
          `Não foi possível conectar em ${host}. Verifique se o llama.cpp server está rodando.`,
        );
      } else {
        setError("Erro: " + (err.message || "Tente novamente."));
      }
    } finally {
      setIsLoading(false);
      setProgress("");
    }
  };

  const downloadHtml = () => {
    const blob = new Blob([generatedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${companyName.toLowerCase().replace(/\s+/g, "-")}-email-${dateStr}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadImage = (img) => {
    const a = document.createElement("a");
    a.href = `data:${img.mediaType};base64,${img.b64}`;
    a.download = `${img.newName}.${img.ext}`;
    a.click();
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedHtml).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const green = "#2d6a4f";
  const greenLight = "#e8f5ee";

  return (
    <div
      style={{
        fontFamily: "var(--font-sans)",
        maxWidth: 860,
        margin: "0 auto",
        padding: "0 0 40px",
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: 24,
          paddingBottom: 20,
          borderBottom: "0.5px solid var(--color-border-tertiary)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--border-radius-md)",
                background: green,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 4l6 5 6-5"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <rect
                  x="1"
                  y="3"
                  width="14"
                  height="10"
                  rx="2"
                  stroke="white"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>
            </div>
            <div>
              <h1
                style={{
                  fontSize: 18,
                  fontWeight: 500,
                  margin: 0,
                  color: "var(--color-text-primary)",
                }}
              >
                Image → E-mail HTML
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "var(--color-text-tertiary)",
                }}
              >
                via llama.cpp · Vulkan
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowConfig(!showConfig)}
            style={{
              padding: "6px 12px",
              border: "0.5px solid var(--color-border-secondary)",
              borderRadius: "var(--border-radius-md)",
              background: showConfig
                ? "var(--color-background-secondary)"
                : "transparent",
              cursor: "pointer",
              fontSize: 12,
              color: "var(--color-text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle
                cx="6.5"
                cy="6.5"
                r="2"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M6.5 1v1.5M6.5 10.5V12M1 6.5h1.5M10.5 6.5H12"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            Servidor
          </button>
        </div>
      </div>

      {/* Server config panel */}
      {showConfig && (
        <div
          style={{
            background: "var(--color-background-secondary)",
            border: "0.5px solid var(--color-border-secondary)",
            borderRadius: "var(--border-radius-lg)",
            padding: 16,
            marginBottom: 20,
          }}
        >
          <p
            style={{
              margin: "0 0 10px",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-text-primary)",
            }}
          >
            Configuração do servidor llama.cpp
          </p>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <input
              value={host}
              onChange={(e) => setHost(e.target.value.replace(/\/$/, ""))}
              placeholder="http://localhost:8080"
              style={{ flex: 1 }}
            />
            <button
              onClick={async () => {
                try {
                  const r = await fetch(`${host}/health`);
                  alert(
                    r.ok ? "Servidor online!" : "Servidor respondeu com erro.",
                  );
                } catch {
                  alert(`Servidor offline em ${host}`);
                }
              }}
              style={{
                padding: "7px 14px",
                border: "0.5px solid var(--color-border-secondary)",
                borderRadius: "var(--border-radius-md)",
                background: "transparent",
                cursor: "pointer",
                fontSize: 13,
                color: "var(--color-text-secondary)",
                whiteSpace: "nowrap",
              }}
            >
              Testar conexão
            </button>
          </div>
          <div
            style={{
              padding: "12px 14px",
              background: "#0d1117",
              borderRadius: "var(--border-radius-md)",
            }}
          >
            <p
              style={{
                margin: "0 0 6px",
                fontSize: 11,
                color: "#7ee787",
                fontFamily: "monospace",
              }}
            >
              # Iniciar llama.cpp com Vulkan + visão:
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: "#cdd9e5",
                fontFamily: "monospace",
                wordBreak: "break-all",
                lineHeight: 1.7,
              }}
            >
              ./llama-server \<br />
              {"  "}-m Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf \<br />
              {"  "}--mmproj mmproj-Qwen2.5-VL-7B-f16.gguf \<br />
              {"  "}-ngl 99 --host 0.0.0.0 --port 8080
            </p>
          </div>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 11,
              color: "var(--color-text-tertiary)",
            }}
          >
            Baixe o modelo e mmproj em:{" "}
            <strong>huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct-GGUF</strong>
          </p>
        </div>
      )}

      {/* Company input */}
      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            display: "block",
            fontSize: 12,
            color: "var(--color-text-secondary)",
            marginBottom: 6,
            fontWeight: 500,
          }}
        >
          NOME DO CLIENTE
        </label>
        <input
          value={companyName}
          onChange={(e) => updateCompany(e.target.value)}
          placeholder="Ex: Hotel Donati"
          style={{ width: "100%", boxSizing: "border-box", maxWidth: 320 }}
        />
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 2,
          marginBottom: 20,
          background: "var(--color-background-secondary)",
          borderRadius: "var(--border-radius-lg)",
          padding: 4,
          width: "fit-content",
        }}
      >
        {[
          ["upload", "Upload"],
          ["preview", "Preview"],
          ["code", "Código HTML"],
        ].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setActiveTab(val)}
            style={{
              padding: "6px 16px",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              borderRadius: "var(--border-radius-md)",
              fontWeight: activeTab === val ? 500 : 400,
              background:
                activeTab === val
                  ? "var(--color-background-primary)"
                  : "transparent",
              color:
                activeTab === val
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
              boxShadow:
                activeTab === val
                  ? "0 0 0 0.5px var(--color-border-tertiary)"
                  : "none",
              transition: "all 0.15s",
            }}
          >
            {label}
            {val === "preview" && generatedHtml && (
              <span
                style={{
                  marginLeft: 6,
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: green,
                  display: "inline-block",
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            background: "var(--color-background-danger)",
            border: "0.5px solid var(--color-border-danger)",
            borderRadius: "var(--border-radius-md)",
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 13,
            color: "var(--color-text-danger)",
          }}
        >
          {error}
          {error.includes("conectar") && (
            <button
              onClick={() => setShowConfig(true)}
              style={{
                marginLeft: 10,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-danger)",
                fontWeight: 500,
                fontSize: 13,
                textDecoration: "underline",
                padding: 0,
              }}
            >
              Configurar servidor →
            </button>
          )}
        </div>
      )}

      {/* UPLOAD TAB */}
      {activeTab === "upload" && (
        <div>
          <div
            style={{
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-lg)",
              padding: 20,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: green,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                1
              </span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                Screenshot do Design do E-mail
              </span>
            </div>
            <div
              onClick={() => designRef.current.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragOver ? green : "var(--color-border-secondary)"}`,
                borderRadius: "var(--border-radius-lg)",
                padding: designImage ? 12 : 40,
                textAlign: "center",
                cursor: "pointer",
                background: dragOver
                  ? greenLight
                  : "var(--color-background-secondary)",
                transition: "all 0.2s",
              }}
            >
              {designImage ? (
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                    textAlign: "left",
                  }}
                >
                  <img
                    src={`data:${designImage.mediaType};base64,${designImage.b64}`}
                    alt="design"
                    style={{
                      width: 80,
                      height: 100,
                      objectFit: "cover",
                      borderRadius: 6,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <p
                      style={{
                        margin: "0 0 4px",
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {designImage.file.name}
                    </p>
                    <p
                      style={{
                        margin: "0 0 10px",
                        fontSize: 12,
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {(designImage.file.size / 1024).toFixed(0)} KB
                    </p>
                    <span style={{ fontSize: 12, color: green }}>
                      Clique para trocar →
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      margin: "0 auto 12px",
                      borderRadius: "var(--border-radius-lg)",
                      background: "var(--color-background-primary)",
                      border: "0.5px solid var(--color-border-secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M10 3v10M5 8l5-5 5 5"
                        stroke="var(--color-text-secondary)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M3 15h14"
                        stroke="var(--color-text-secondary)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <p
                    style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 500 }}
                  >
                    Arraste ou clique para upload
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "var(--color-text-tertiary)",
                    }}
                  >
                    PNG, JPG ou WEBP do design do e-mail
                  </p>
                </div>
              )}
            </div>
            <input
              ref={designRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleDesignChange}
            />
          </div>

          <div
            style={{
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-lg)",
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "var(--color-background-secondary)",
                    color: "var(--color-text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 500,
                    border: "0.5px solid var(--color-border-secondary)",
                    flexShrink: 0,
                  }}
                >
                  2
                </span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>
                  Imagens de Conteúdo{" "}
                  <span
                    style={{
                      fontWeight: 400,
                      color: "var(--color-text-tertiary)",
                    }}
                  >
                    (opcional)
                  </span>
                </span>
              </div>
              <button
                onClick={() => contentRef.current.click()}
                style={{
                  padding: "6px 14px",
                  border: "0.5px solid var(--color-border-secondary)",
                  borderRadius: "var(--border-radius-md)",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                + Adicionar fotos
              </button>
            </div>
            <input
              ref={contentRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={handleContentChange}
            />
            {contentImages.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px 0",
                  borderTop: "0.5px solid var(--color-border-tertiary)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  Fotos renomeadas automaticamente — {dateStr}
                </p>
              </div>
            ) : (
              <div
                style={{
                  borderTop: "0.5px solid var(--color-border-tertiary)",
                }}
              >
                {contentImages.map((img, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom: "0.5px solid var(--color-border-tertiary)",
                    }}
                  >
                    <img
                      src={`data:${img.mediaType};base64,${img.b64}`}
                      alt=""
                      style={{
                        width: 52,
                        height: 52,
                        objectFit: "cover",
                        borderRadius: 6,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: "0 0 2px",
                          fontSize: 13,
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {img.newName}.{img.ext}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          color: "var(--color-text-tertiary)",
                        }}
                      >
                        Original: {img.originalName}
                      </p>
                    </div>
                    <button
                      onClick={() => downloadImage(img)}
                      style={{
                        padding: "5px 10px",
                        border: "0.5px solid var(--color-border-secondary)",
                        borderRadius: "var(--border-radius-md)",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: 11,
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeContent(i)}
                      style={{
                        padding: "5px 10px",
                        border: "0.5px solid var(--color-border-danger)",
                        borderRadius: "var(--border-radius-md)",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: 11,
                        color: "var(--color-text-danger)",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ textAlign: "center" }}>
            <button
              onClick={generateEmail}
              disabled={isLoading || !designImage}
              style={{
                padding: "12px 32px",
                border: "none",
                borderRadius: "var(--border-radius-lg)",
                background:
                  isLoading || !designImage
                    ? "var(--color-background-secondary)"
                    : green,
                color:
                  isLoading || !designImage
                    ? "var(--color-text-tertiary)"
                    : "#fff",
                cursor: isLoading || !designImage ? "not-allowed" : "pointer",
                fontSize: 15,
                fontWeight: 500,
                minWidth: 240,
                transition: "all 0.2s",
              }}
            >
              {isLoading ? (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      display: "inline-block",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  {progress}
                </span>
              ) : (
                "Gerar E-mail HTML →"
              )}
            </button>
          </div>
        </div>
      )}

      {/* PREVIEW TAB */}
      {activeTab === "preview" && (
        <div>
          {generatedHtml ? (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    background: "var(--color-background-secondary)",
                    borderRadius: "var(--border-radius-md)",
                    padding: 3,
                  }}
                >
                  {[
                    ["desktop", "Desktop"],
                    ["mobile", "Mobile"],
                  ].map(([m, label]) => (
                    <button
                      key={m}
                      onClick={() => setPreviewMode(m)}
                      style={{
                        padding: "4px 12px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        borderRadius: 6,
                        fontWeight: previewMode === m ? 500 : 400,
                        background:
                          previewMode === m
                            ? "var(--color-background-primary)"
                            : "transparent",
                        color:
                          previewMode === m
                            ? "var(--color-text-primary)"
                            : "var(--color-text-secondary)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setActiveTab("code")}
                    style={{
                      padding: "7px 14px",
                      border: "0.5px solid var(--color-border-secondary)",
                      borderRadius: "var(--border-radius-md)",
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    Ver código
                  </button>
                  <button
                    onClick={downloadHtml}
                    style={{
                      padding: "7px 16px",
                      border: "none",
                      borderRadius: "var(--border-radius-md)",
                      background: green,
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    ↓ Baixar HTML
                  </button>
                </div>
              </div>
              <div
                style={{
                  background: "var(--color-background-secondary)",
                  borderRadius: "var(--border-radius-lg)",
                  padding: previewMode === "mobile" ? "20px" : "20px 0",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <iframe
                  srcDoc={generatedHtml}
                  style={{
                    width: previewMode === "mobile" ? 390 : "100%",
                    height: 620,
                    border: "none",
                    borderRadius: 8,
                    background: "#fff",
                    boxShadow:
                      previewMode === "mobile"
                        ? "0 4px 20px rgba(0,0,0,0.15)"
                        : "none",
                  }}
                  title="Email Preview"
                />
              </div>
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "var(--color-text-secondary)",
              }}
            >
              <p style={{ fontSize: 14, margin: "0 0 16px" }}>
                Nenhum e-mail gerado ainda
              </p>
              <button
                onClick={() => setActiveTab("upload")}
                style={{
                  padding: "9px 20px",
                  border: "none",
                  borderRadius: "var(--border-radius-md)",
                  background: green,
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                ← Ir para Upload
              </button>
            </div>
          )}
        </div>
      )}

      {/* CODE TAB */}
      {activeTab === "code" && (
        <div>
          {generatedHtml ? (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <span
                  style={{ fontSize: 13, color: "var(--color-text-secondary)" }}
                >
                  {generatedHtml.length.toLocaleString()} caracteres
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={copyCode}
                    style={{
                      padding: "7px 14px",
                      border: "0.5px solid var(--color-border-secondary)",
                      borderRadius: "var(--border-radius-md)",
                      background: copied ? greenLight : "transparent",
                      cursor: "pointer",
                      fontSize: 13,
                      color: copied ? green : "var(--color-text-secondary)",
                      transition: "all 0.2s",
                    }}
                  >
                    {copied ? "✓ Copiado!" : "Copiar código"}
                  </button>
                  <button
                    onClick={downloadHtml}
                    style={{
                      padding: "7px 16px",
                      border: "none",
                      borderRadius: "var(--border-radius-md)",
                      background: green,
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    ↓ Baixar HTML
                  </button>
                </div>
              </div>
              <pre
                style={{
                  background: "var(--color-background-secondary)",
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: "var(--border-radius-lg)",
                  padding: 16,
                  overflow: "auto",
                  fontSize: 11,
                  maxHeight: 520,
                  margin: 0,
                  lineHeight: 1.6,
                  fontFamily: "var(--font-mono)",
                }}
              >
                {generatedHtml}
              </pre>
              {contentImages.length > 0 && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 14,
                    background: greenLight,
                    borderRadius: "var(--border-radius-lg)",
                    border: `0.5px solid ${green}30`,
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: 13,
                      fontWeight: 500,
                      color: green,
                    }}
                  >
                    Imagens renomeadas
                  </p>
                  {contentImages.map((img, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <code
                        style={{
                          fontSize: 11,
                          background: "#fff",
                          padding: "2px 6px",
                          borderRadius: 4,
                          color: green,
                        }}
                      >
                        {img.newName}.{img.ext}
                      </code>
                      <button
                        onClick={() => downloadImage(img)}
                        style={{
                          fontSize: 11,
                          color: green,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          textDecoration: "underline",
                        }}
                      >
                        Baixar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "var(--color-text-secondary)",
              }}
            >
              <p style={{ fontSize: 14, margin: "0 0 16px" }}>
                Nenhum código gerado ainda
              </p>
              <button
                onClick={() => setActiveTab("upload")}
                style={{
                  padding: "9px 20px",
                  border: "none",
                  borderRadius: "var(--border-radius-md)",
                  background: green,
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                ← Ir para Upload
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
