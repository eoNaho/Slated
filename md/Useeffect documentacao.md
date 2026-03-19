# Por que banimos o `useEffect` do React

> **Autor:** Alvin Sng | **Empresa:** Factory | **Fonte:** Thread no X (@alvinsng) — Março 2026

---

## Resumo Executivo

Na Factory, adotamos uma regra simples, porém impactante: **nenhum componente chama `useEffect` diretamente.** Esta decisão, fruto de incidentes reais em produção, tornou nosso codebase mais previsível, mais fácil de raciocinar e muito mais difícil de quebrar por acidente.

---

## 1. Contexto e Motivação

### O problema com `useEffect`

O `useEffect` é um dos hooks mais utilizados do React, mas também um dos mais propensos a erros. Na prática, ele é frequentemente adicionado como solução de contorno para problemas que o React já resolve com primitivas melhores:

- Estado derivado (_derived state_)
- Handlers de eventos
- Abstrações de _data-fetching_

O uso irresponsável do hook frequentemente resulta em:

- Race conditions (condições de corrida)
- Loops infinitos de re-renderização
- Comportamento _flaky_ difícil de reproduzir
- Degradação silenciosa de performance

> _"useEffect é muitas vezes adicionado por precaução, mas essa jogada é a semente da próxima race condition ou loop infinito."_ — Alvin Sng

### A origem da regra: bugs em produção

A equipe não chegou a essa decisão facilmente. O processo foi gradual, impulsionado por incidentes reais rastreados via Slack threads causados por `useEffect` mal utilizado. A regra surgiu de **dor real**, não de opiniões puramente teóricas.

---

## 2. A Regra: Nunca `useEffect` diretamente

### O que significa "proibido"

A equipe nunca chama `useEffect` diretamente nos componentes. Para o caso raro em que é necessário sincronizar com um sistema externo no mount, foi criado um hook específico:

```js
// ❌ PROIBIDO
useEffect(() => {
  fetchData();
}, []);

// ✅ PERMITIDO
useMountEffect(() => {
  fetchData();
});
```

### O que é `useMountEffect`?

Não é mágica: é simplesmente o `useEffect` com array de dependências vazio, mas encapsulado em um hook nomeado:

```js
function useMountEffect(fn) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(fn, []);
}
```

O objetivo do wrapper não é funcionalidade, mas **intenção explícita** e prevenção de uso ad-hoc de efeitos nos componentes.

---

## 3. Alternativas ao `useEffect`

A maioria dos casos de uso do `useEffect` pode e deve ser substituída por padrões mais seguros e declarativos.

### 3.1 Estado Derivado (_Derived State_)

Em vez de sincronizar estado com `useEffect`, compute-o diretamente durante o render:

```js
// ❌ Antipadrão com useEffect
const [fullName, setFullName] = useState("");
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// ✅ Estado derivado
const fullName = `${firstName} ${lastName}`;
```

### 3.2 Montagem Condicional com `key`

Se o requisito é "começar do zero quando o ID muda", use a semântica de remount do React diretamente via prop `key`:

```jsx
// ✅ Remount automático ao mudar o ID
<UserProfile key={userId} userId={userId} />
```

Banir o `useEffect` direto funciona como um _forcing function_ para um design de árvore mais limpo. Pais possuem a orquestração e os limites de ciclo de vida. Filhos podem assumir que as pré-condições já foram atendidas.

### 3.3 Event Handlers

Lógica que reage a eventos do usuário não precisa de efeitos — apenas handlers:

```js
// ❌ Antipadrão
useEffect(() => {
  if (submitted) processForm();
}, [submitted]);

// ✅ Handler direto
function handleSubmit() {
  processForm();
}
```

---

## 4. Filosofia de Design

### Unix Philosophy aplicada ao React

A abordagem da Factory espelha a filosofia Unix:

- Cada unidade faz um único trabalho
- A coordenação acontece em limites claros e explícitos
- Componentes pai orquestram; componentes filho recebem pré-condições já atendidas

> Proibir `useEffect` direto é um _forcing function_ para componentes menores, mais focados e com menos efeitos colaterais ocultos.

### Modos de falha preferíveis

Toda equipe vai ter bugs. A questão é: qual modo de falha você prefere?

| Critério        | `useMountEffect`        | `useEffect` direto    |
| --------------- | ----------------------- | --------------------- |
| Tipo de falha   | Binária e ruidosa       | Gradual e silenciosa  |
| Visibilidade    | Imediata (rodou ou não) | Tardia (flaky, loops) |
| Depuração       | Mais simples            | Complexa              |
| Previsibilidade | Alta                    | Baixa                 |

---

## 5. Impacto no Contexto de Agentes de IA

A regra se torna ainda mais relevante com o avanço do uso de agentes de IA na escrita de código:

> _"Isso importa ainda mais agora que agentes estão escrevendo o código. useEffect é frequentemente adicionado como solução de contorno, mas essa jogada é a semente da próxima race condition ou loop infinito."_ — Alvin Sng

- Agentes de IA seguem padrões de treinamento — regras explícitas os guiam
- `useEffect` é uma ferramenta de alto risco em mãos sem contexto de estado global
- Convenções como `useMountEffect` comunicam intenção ao agente e ao revisor humano

---

## 6. Conclusões e Lições Aprendidas

### O que a regra realmente ensina

Banir `useEffect` não é sobre o hook em si. É sobre forçar a equipe a pensar com mais clareza sobre:

- Onde a lógica de orquestração deve viver (nos pais, não nos filhos)
- Quando usar estado derivado em vez de estado sincronizado
- Como comunicar intenção através de nomes de hooks e estrutura de código
- Qual modo de falha é mais aceitável para o produto

### Resultados práticos

- Codebase mais fácil de raciocinar
- Muito mais difícil de quebrar acidentalmente
- Componentes menores e mais focados
- Menos efeitos colaterais ocultos
- Falhas mais ruidosas e mais fáceis de diagnosticar

---

## Referências

- Alvin Sng — Thread original no X (@alvinsng), Março 2026
- [React Docs — useEffect](https://react.dev/reference/react/useEffect)
- [React Docs — You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
