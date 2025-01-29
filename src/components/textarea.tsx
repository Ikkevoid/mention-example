"use client";

import React, {
	useState,
	useRef,
	useEffect,
	type ChangeEvent,
	type KeyboardEvent,
} from "react";

type User = { id: number; fullName: string };

const MOCK_USERS: User[] = [
	{ id: 1, fullName: "Jan Kowalski" },
	{ id: 2, fullName: "Anna Nowak" },
	{ id: 3, fullName: "Marek Kwaśniewski" },
	{ id: 4, fullName: "Joanna Zielińska" },
	{ id: 5, fullName: "Krzysztof Nowicki" },
];

export default function MentionTextarea() {
	const [inputValue, setInputValue] = useState("");
	const [suggestions, setSuggestions] = useState<User[]>([]);
	const [isMentioning, setIsMentioning] = useState(false);
	const [activeSuggestionIdx, setActiveSuggestionIndex] = useState(0);
	const [caretCoords, setCaretCoords] = useState({ top: 0, left: 0 });

	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const mirrorRef = useRef<HTMLDivElement | null>(null);

	const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
		const val = e.target.value;
		setInputValue(val);

		const caretIndex = e.target.selectionStart || 0;
		const textUntilCaret = val.slice(0, caretIndex);
		const atIndex = textUntilCaret.lastIndexOf("@");

		if (atIndex === -1) {
			resetMentionState();
			return;
		}

		const mentionSnippet = textUntilCaret.slice(atIndex + 1, caretIndex);
		if (!mentionSnippet.trim()) {
			resetMentionState();
			return;
		}

		setIsMentioning(true);
		setSuggestions(
			MOCK_USERS.filter((u) =>
				u.fullName.toLowerCase().includes(mentionSnippet.toLowerCase()),
			),
		);
		setActiveSuggestionIndex(0);
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (!isMentioning || suggestions.length === 0) return;

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				setActiveSuggestionIndex((prev) => (prev + 1) % suggestions.length);
				break;
			case "ArrowUp":
				e.preventDefault();
				setActiveSuggestionIndex((prev) =>
					prev === 0 ? suggestions.length - 1 : prev - 1,
				);
				break;
			case "Enter":
				e.preventDefault();
				selectSuggestion(suggestions[activeSuggestionIdx]);
				break;
			case "Escape":
				resetMentionState();
				break;
			default:
				break;
		}
	};

	const resetMentionState = () => {
		setIsMentioning(false);
		setSuggestions([]);
	};

	const selectSuggestion = (user: User) => {
		const el = textareaRef.current;
		if (!el) return;

		const caretIndex = el.selectionStart || 0;
		const textUntilCaret = inputValue.slice(0, caretIndex);
		const atIndex = textUntilCaret.lastIndexOf("@");

		if (atIndex !== -1) {
			const before = inputValue.slice(0, atIndex);
			const after = inputValue.slice(caretIndex);
			const newValue = `${before}@${user.fullName} ${after}`;

			setInputValue(newValue);
			resetMentionState();

			setTimeout(() => {
				const newCaretPos = `${before}@${user.fullName} `.length;
				el.setSelectionRange(newCaretPos, newCaretPos);
				el.focus();
			}, 0);
		}
	};

	useEffect(() => {
		const el = textareaRef.current;
		const mirror = mirrorRef.current;

		if (!el || !mirror) return;

		const computedStyles = window.getComputedStyle(el);

		const excludeProps = new Set(["visibility", "position", "display"]);

		for (const prop of computedStyles) {
			if (!excludeProps.has(prop)) {
				mirror.style.setProperty(prop, computedStyles.getPropertyValue(prop));
			}
		}

		mirror.style.position = "absolute";
		mirror.style.top = "0";
		mirror.style.left = "0";
		mirror.style.whiteSpace = "pre-wrap";
		mirror.style.wordWrap = "break-word";

		mirror.innerHTML = "";

		const caretIndex = el.selectionStart || 0;
		const textUntilCaret = inputValue.slice(0, caretIndex);

		const textNode = document.createTextNode(textUntilCaret);
		mirror.appendChild(textNode);

		const caretMarker = document.createElement("span");
		caretMarker.id = "caret-marker";
		caretMarker.textContent = "\u200B"; // Zero-width space
		mirror.appendChild(caretMarker);

		const caretSpan = mirror.querySelector("#caret-marker");
		if (!caretSpan) return;

		const mirrorRect = mirror.getBoundingClientRect();
		const spanRect = caretSpan.getBoundingClientRect();

		const lineHeight = Number.parseFloat(
			window.getComputedStyle(el).lineHeight || "20",
		);

		setCaretCoords({
			top: spanRect.top - mirrorRect.top + lineHeight,
			left: spanRect.left - mirrorRect.left,
		});
	}, [inputValue]);

	return (
		<div className="relative w-full">
			<textarea
				ref={textareaRef}
				className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-sky-300"
				rows={5}
				value={inputValue}
				onChange={handleInputChange}
				onKeyDown={handleKeyDown}
				onBlur={resetMentionState}
				placeholder="Wiadomość"
			/>

			{isMentioning && suggestions.length > 0 && (
				<div
					className="absolute bg-white border border-gray-200 rounded shadow-md z-10"
					style={{ top: caretCoords.top, left: caretCoords.left }}
				>
					{suggestions.map((user, idx) => (
						// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
						<div
							key={user.id}
							className={`p-2 text-sm cursor-pointer ${
								idx === activeSuggestionIdx ? "bg-sky-100" : "hover:bg-sky-100"
							}`}
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => selectSuggestion(user)}
							aria-selected={idx === activeSuggestionIdx}
						>
							{user.fullName}
						</div>
					))}
				</div>
			)}

			<div
				ref={mirrorRef}
				className="absolute invisible top-0 left-0 -z-10"
				aria-hidden="true"
			/>
		</div>
	);
}
