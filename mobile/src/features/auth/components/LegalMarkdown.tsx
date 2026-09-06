/**
 * 번들된 약관 마크다운을 design.md §6.6 의 규칙대로 렌더한다.
 *
 * 마크다운 라이브러리를 새로 들이지 않는다 — 필요한 문법이 여섯 가지뿐이고,
 * 새 의존성은 심사에 영향을 줄 수 있어 임의로 정하지 않는다 (M-19 / 절대 규칙 8).
 *
 * <b>원문을 요약하거나 재작성하지 않는다.</b> 표시 형태만 정한다.
 */
import React, {useMemo} from 'react';
import {Text, View} from 'react-native';

type Block =
  | {kind: 'heading'; level: 2 | 3; text: string}
  | {kind: 'paragraph'; text: string}
  | {kind: 'listItem'; text: string}
  | {kind: 'table'; rows: string[][]}
  | {kind: 'rule'};

export function LegalMarkdown({source}: {source: string}) {
  const blocks = useMemo(() => parse(source), [source]);

  return (
    <View>
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} />
      ))}
    </View>
  );
}

function BlockView({block}: {block: Block}) {
  switch (block.kind) {
    case 'heading':
      return block.level === 2 ? (
        <Text accessibilityRole="header" className="mb-2 mt-7 text-title text-ink">
          <Inline text={block.text} />
        </Text>
      ) : (
        <Text accessibilityRole="header" className="mb-1 mt-4 text-body-sm font-bold text-ink">
          <Inline text={block.text} />
        </Text>
      );

    case 'paragraph':
      return (
        <Text selectable className="mb-3 text-body-sm leading-[22px] text-ink-body">
          <Inline text={block.text} />
        </Text>
      );

    case 'listItem':
      return (
        <View className="mb-2 flex-row pl-4">
          <Text selectable className="text-body-sm leading-[22px] text-ink-body">
            <Inline text={block.text} />
          </Text>
        </View>
      );

    case 'table':
      return <TableView rows={block.rows} />;

    case 'rule':
      return <View className="my-6 h-[1px] bg-border" />;
  }
}

function TableView({rows}: {rows: string[][]}) {
  const [header, ...body] = rows;
  return (
    <View className="mb-3 overflow-hidden rounded-[12px] border border-border bg-surface">
      {header ? (
        <View className="flex-row bg-cream">
          {header.map((cell, index) => (
            <Text key={index} className="flex-1 p-3 text-caption font-bold text-ink">
              {cell}
            </Text>
          ))}
        </View>
      ) : null}
      {body.map((row, rowIndex) => (
        // 행 단위로 묶어 "항목: …, 설명: …" 형태로 읽히게 한다 (§6.9).
        <View
          key={rowIndex}
          accessible
          accessibilityLabel={row
            .map((cell, index) => `${header?.[index] ?? ''}: ${cell}`)
            .join(', ')}
          className="flex-row border-t border-border">
          {row.map((cell, index) => (
            <Text key={index} selectable className="flex-1 p-3 text-caption text-ink-body">
              <Inline text={cell} />
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * 인라인 표기: 굵은 글씨와 `{{ }}` 미확정 값.
 *
 * 미확정 값은 <b>임의의 값을 넣지 않고 그대로 표시</b>한다 (§6.6) — 채워지지 않았다는 사실이
 * 화면에 드러나야 배포 전에 발견된다.
 */
function Inline({text}: {text: string}) {
  const parts = text.split(/(\*\*[^*]+\*\*|\{\{[^}]+\}\}|`[^`]+`)/g).filter(Boolean);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={index} className="font-semibold text-ink">
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (part.startsWith('{{') && part.endsWith('}}')) {
          return (
            <Text key={index} className="bg-brand-light text-ink-muted">
              {part}
            </Text>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          const inner = part.slice(1, -1);
          // 백틱 안에 미확정 값이 들어 있는 경우가 있다 (`{{운영자명}}`).
          return inner.startsWith('{{') && inner.endsWith('}}') ? (
            <Text key={index} className="bg-brand-light text-ink-muted">
              {inner}
            </Text>
          ) : (
            <Text key={index}>{inner}</Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      })}
    </>
  );
}

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.split('\n');
  let paragraph: string[] = [];
  let table: string[][] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({kind: 'paragraph', text: paragraph.join(' ')});
      paragraph = [];
    }
  };
  const flushTable = () => {
    if (table.length > 0) {
      blocks.push({kind: 'table', rows: table});
      table = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith('|')) {
      flushParagraph();
      const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
      // 구분 행(|---|---|)은 표의 데이터가 아니다.
      if (!cells.every(cell => /^:?-{2,}:?$/.test(cell))) {
        table.push(cells);
      }
      continue;
    }
    flushTable();

    if (line.trim().length === 0) {
      flushParagraph();
      continue;
    }
    if (/^-{3,}$/.test(line.trim())) {
      flushParagraph();
      blocks.push({kind: 'rule'});
      continue;
    }
    if (line.startsWith('### ')) {
      flushParagraph();
      blocks.push({kind: 'heading', level: 3, text: line.slice(4)});
      continue;
    }
    if (line.startsWith('## ')) {
      flushParagraph();
      blocks.push({kind: 'heading', level: 2, text: line.slice(3)});
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      flushParagraph();
      blocks.push({kind: 'listItem', text: line.trim()});
      continue;
    }
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushTable();
  return blocks;
}
