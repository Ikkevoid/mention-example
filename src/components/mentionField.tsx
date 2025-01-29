"use client";

import { useRef, useState } from "react";

const MOCK_USERS: User[] = [
	{ id: 1, name: "Jan Kowalski" },
	{ id: 2, name: "Anna Nowak" },
	{ id: 3, name: "Marek Kwaśniewski" },
	{ id: 4, name: "Joanna Zielińska" },
	{ id: 5, name: "Krzysztof Nowicki" },
];

type User = { id: number; name: string };

export default function MentionField() {
	const editorRef = useRef<HTMLDivElement>(null);
	const mentionSelectionRef = useRef<Range | null>(null);

	const [showSuggestions, setShowSuggestions] = useState(false);
	const [suggestions, setSuggestions] = useState<User[]>([]);
	const [highlightedIndex, setHighlightedIndex] = useState(0);

	const [position, setPosition] = useState({ x: 0, y: 0 });

	const filterSuggestions = (query: string) => {
		if (!query) return MOCK_USERS;

		return MOCK_USERS.filter((u) =>
			u.name.toLowerCase().startsWith(query.toLowerCase()),
		);
	};

	const insertMention = (mentionName: string) => {
		const range = mentionSelectionRef.current;
		if (!range || !editorRef.current) return;

		range.deleteContents();

		const mentionSpan = document.createElement("span");
		mentionSpan.textContent = `@${mentionName}`;
		mentionSpan.className = "bg-sky-200 rounded px-1";
		mentionSpan.setAttribute("contenteditable", "false");
		range.insertNode(mentionSpan);

		range.collapse(false);
		const space = document.createTextNode(" ");
		range.insertNode(space);
		range.setStartAfter(space);
		range.setEndAfter(space);

		const selection = window.getSelection();
		selection?.removeAllRanges();
		selection?.addRange(range);

		mentionSelectionRef.current = null;
		setShowSuggestions(false);
		setSuggestions([]);
		setHighlightedIndex(0);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (!showSuggestions || suggestions.length === 0) return;

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();

				setHighlightedIndex((idx) =>
					idx === suggestions.length - 1 ? 0 : idx + 1,
				);
				break;

			case "ArrowUp":
				e.preventDefault();

				setHighlightedIndex((idx) =>
					idx === 0 ? suggestions.length - 1 : idx - 1,
				);
				break;

			case "Enter":
				e.preventDefault();

				insertMention(suggestions[highlightedIndex].name);
				break;

			case "Escape":
				e.preventDefault();

				setShowSuggestions(false);
				mentionSelectionRef.current = null;
				break;
		}
	};

	const handleInput = () => {
		const selection = window.getSelection();
		const editor = editorRef.current;
		if (!selection || !editor) return;

		const anchorNode = selection.anchorNode;
		const focusOffset = selection.focusOffset;

		if (!anchorNode || anchorNode.nodeType !== Node.TEXT_NODE) {
			setShowSuggestions(false);
			mentionSelectionRef.current = null;

			return;
		}

		const nodeText = anchorNode.nodeValue ?? "";
		const upToCaret = nodeText.substring(0, focusOffset);

		// Detects mention character without triggering on email address
		const match = upToCaret.match(/(?:^|\s)@([\w ]*)$/);
		if (!match) {
			setShowSuggestions(false);
			mentionSelectionRef.current = null;

			return;
		}

		const query = match[1] || "";
		setShowSuggestions(true);
		setSuggestions(filterSuggestions(query));
		setHighlightedIndex(0);

		const mentionStart = focusOffset - match[0].length;
		const newRange = document.createRange();

		try {
			newRange.setStart(anchorNode, mentionStart);
			newRange.setEnd(anchorNode, focusOffset);
			mentionSelectionRef.current = newRange;

			const rect = newRange.getBoundingClientRect();
			const containerRect = editor.getBoundingClientRect();

			setPosition({
				x: rect.left - containerRect.left,
				y: rect.bottom - containerRect.top,
			});
		} catch (err) {
			console.error(err);
			mentionSelectionRef.current = null;
		}
	};

	const handleSuggestionClick = (e: React.MouseEvent, idx: number) => {
		e.preventDefault();

		insertMention(suggestions[idx].name);
	};

	return (
		<div className="relative mx-auto mt-10 w-full max-w-md">
			<div
				ref={editorRef}
				className="min-h-[4lh] w-full rounded border border-gray-300 bg-white p-2 focus:outline-none focus:ring-2 focus:ring-sky-300"
				contentEditable
				suppressContentEditableWarning
				onKeyDown={handleKeyDown}
				onInput={handleInput}
			/>

			{showSuggestions && suggestions.length > 0 && (
				<ul
					className="absolute z-10 rounded border border-gray-200 bg-white shadow-md"
					style={{ left: position.x, top: position.y }}
				>
					{suggestions.map((item, index) => (
						<li
							key={item.id}
							className={`cursor-pointer p-2 text-sm hover:bg-sky-100 ${index === highlightedIndex ? "bg-sky-100" : ""}`}
							onClick={(e) => handleSuggestionClick(e, index)}
						>
							{item.name}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
