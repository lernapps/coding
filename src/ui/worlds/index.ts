// The views of the worlds by type (the pure part of a world is in src/core/worlds/).
import type { Component } from "vue";
import Labyrinth from "./labyrinth/View.vue";
import Turtle from "./turtle/View.vue";

export const VIEWS: Readonly<Record<string, Component>> = { labyrinth: Labyrinth, turtle: Turtle };
