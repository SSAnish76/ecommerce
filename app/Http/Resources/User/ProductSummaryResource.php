<?php

declare(strict_types=1);

namespace App\Http\Resources\User;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Product
 */
class ProductSummaryResource extends JsonResource
{
    public function __construct(
        mixed $resource,
        protected bool $isWishlist = false
    ) {
        parent::__construct($resource);
    }

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Product $product */
        $product = $this->resource;

        return $product->toSummaryArray($this->isWishlist);
    }
}
