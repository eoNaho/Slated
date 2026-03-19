# Propostas de Customização de Perfil

Este documento detalha ideias para expandir a capacidade de customização dos usuários no sistema de perfis do **PixelReel**, focando em estética visual, funcionalidade modular e gamificação.

---

## 🎨 1. Estética Visual: Cores e Temas

### **Cores de Destaque (Accent Colors)**
Permitir que o usuário escolha uma cor principal (hexadecimal ou paleta) que defina a identidade visual do seu perfil.
- **Impacto**: Botões primários, indicadores de tabs ativas, bordas de avatares e efeitos de hover.
- **Premium**: Efeito de "Glow" (brilho neon) atrás do avatar ou banner usando a cor escolhida.

### **Temas de Perfil (Profile Skins)**
Oferecer presets visuais fixos que alteram o CSS do perfil.
- **Exemplos**: 
    - *Cinema Noir*: Alto contraste, p&b com granulação fina.
    - *Vaporwave*: Gradientes rosa/azul e estética retrô.
    - *Midnight*: Tons de azul profundo e interfaces semi-transparentes.
    - *Old school*: Estética de interface de sistemas antigos.

---

## 🍱 2. Funcionalidade Modular: "Featured Slot"

Um espaço de destaque no topo do perfil, logo abaixo do cabeçalho, onde o usuário escolhe o que é mais importante exibir.

- **Review em Destaque**: Fixar aquela crítica longa ou bem avaliada que o usuário escreveu.
- **Lista Curada**: Exibir uma coleção específica (ex: "Meus filmes favoritos de terror").
- **Top 5 (Ampliado)**: Uma fileira horizontal com os 5 filmes favoritos da vida (atualmente são apenas 4).
- **Milestone Showcase**: Exibir o marco de conquista mais difícil de obter.

---

## 🏆 3. Gamificação: Showcase de Badges

Exibir conquistas diretamente no cabeçalho do perfil para reconhecimento imediato.
- **Implementação**: Usuário pode selecionar até 3 insígnias (badges) desbloqueadas para fixar ao lado do nome ou abaixo da bio.
- **Conexão**: Já existe o esquema de `achievements` no banco de dados, bastando a interface de seleção e exibição.

---

## 📐 4. Layout: Reordenação de Seções

Dar ao usuário o controle sobre a ordem das seções do perfil.
- **Exemplo**: O usuário pode preferir que o "Diário" apareça antes das "Listas", ou que a "Atividade Recente" seja o primeiro item.
- **Técnico**: Salvar um JSON `layoutConfig` nas configurações do usuário.

---

## 🛠️ Próximos Passos (Plano Técnico)

1. **DB**: Adicionar campos `accent_color`, `profile_theme`, `layout_config` e `showcased_badges` na tabela `user_settings`.
2. **Settings**: Criar uma nova aba "Customização" no `/settings` com seletores de cores e temas.
3. **Frontend**: Atualizar o `ProfileHeader` e o `ProfileTabs` para herdar essas configurações dinamicamente.
